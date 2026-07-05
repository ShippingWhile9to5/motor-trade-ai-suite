"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { getCaseWorkflow } from "../../lib/services/cases";
import { createUploadReference } from "../../lib/services/upload";
import { listCaseDocumentsWorkflow } from "../../lib/services/storage";
import { runFactFindExtractionWorkflow } from "../../lib/services/extraction-execution";
import { getExtractionProvider } from "../../lib/providers/get-extraction-provider";
import type { ExtractionSourceFile } from "../../lib/providers/extraction";

// A fact-find is fully legible well below full iPhone resolution. Downscaling
// before sending to the model cuts vision-token processing (and latency) sharply
// so extraction fits inside the serverless function time limit.
const MAX_IMAGE_EDGE_PX = 1600;

async function downscaleToJpegBase64(input: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  const output = await sharp(input)
    .rotate() // honour EXIF orientation from phone photos
    .resize(MAX_IMAGE_EDGE_PX, MAX_IMAGE_EDGE_PX, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return output.toString("base64");
}

/**
 * Reads the file bytes into a base64 payload for the AI provider, converting
 * iPhone HEIC/HEIF photos to JPEG (Claude vision does not accept HEIC) and
 * downscaling photos. The returned bytes are transient and never written to
 * storage.
 */
async function toExtractionSource(
  file: File,
  buffer: Buffer,
): Promise<ExtractionSourceFile> {
  const type = file.type.toLowerCase();
  const isHeic =
    type === "image/heic" ||
    type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (isHeic) {
    const convert = (await import("heic-convert")).default;
    const jpeg = await convert({ buffer, format: "JPEG", quality: 0.9 });

    return {
      file_name: file.name,
      media_type: "image/jpeg",
      data_base64: await downscaleToJpegBase64(Buffer.from(jpeg)),
    };
  }

  if (type === "application/pdf") {
    return {
      file_name: file.name,
      media_type: "application/pdf",
      data_base64: buffer.toString("base64"),
    };
  }

  // Other raster images (jpg/png/webp) — downscale to a JPEG too.
  return {
    file_name: file.name,
    media_type: "image/jpeg",
    data_base64: await downscaleToJpegBase64(buffer),
  };
}

const getCaseDocumentsActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

const uploadCaseDocumentsActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export async function getCaseDocumentsAction(input: unknown) {
  const user = await requireUser();
  const data = getCaseDocumentsActionInputSchema.parse(input);

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return [];
  }

  return listCaseDocumentsWorkflow({
    case_id: userCase.id,
  });
}

export async function uploadCaseDocumentsAction(formData: FormData) {
  const user = await requireUser();
  const data = uploadCaseDocumentsActionInputSchema.parse({
    case_id: formData.get("case_id"),
  });

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return {
      success: false as const,
      errors: ["Case not found."],
    };
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return {
      success: false as const,
      errors: ["Choose at least one file."],
    };
  }

  const references = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await createUploadReference({
      case_id: userCase.id,
      user_id: user.userId,
      file,
    });

    if (result.success) {
      references.push(result.reference);
      continue;
    }

    errors.push(
      `${file.name}: ${result.errors.map((error) => error.message).join(" ")}`,
    );
  }

  if (errors.length > 0) {
    return {
      success: false as const,
      errors,
      references,
    };
  }

  revalidatePath(`/dashboard/cases/${userCase.id}`);

  return {
    success: true as const,
    references,
  };
}

export async function uploadAndExtractCaseDocumentsAction(formData: FormData) {
  const user = await requireUser();
  const data = uploadCaseDocumentsActionInputSchema.parse({
    case_id: formData.get("case_id"),
  });

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return {
      success: false as const,
      errors: ["Case not found."],
    };
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return {
      success: false as const,
      errors: ["Choose at least one file."],
    };
  }

  const references = [];
  const sourceFiles: ExtractionSourceFile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await createUploadReference({
      case_id: userCase.id,
      user_id: user.userId,
      file,
    });

    if (!result.success) {
      errors.push(
        `${file.name}: ${result.errors.map((error) => error.message).join(" ")}`,
      );
      continue;
    }

    references.push(result.reference);

    const buffer = Buffer.from(await file.arrayBuffer());
    sourceFiles.push(await toExtractionSource(file, buffer));
  }

  if (errors.length > 0) {
    return {
      success: false as const,
      errors,
    };
  }

  try {
    const result = await runFactFindExtractionWorkflow(
      {
        case_id: userCase.id,
        document_id: references[0].id,
        user_id: user.userId,
      },
      sourceFiles,
      getExtractionProvider(),
    );

    if (!result.success) {
      return {
        success: false as const,
        errors: ["Extraction result was invalid. Check the document and retry."],
      };
    }

    revalidatePath(`/dashboard/cases/${userCase.id}`);

    return {
      success: true as const,
      references,
      missing_required_fields: result.missing_required_fields,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction could not be created.";

    return {
      success: false as const,
      errors: [
        process.env.NODE_ENV === "production"
          ? "Extraction could not be completed. Please retry."
          : message,
      ],
    };
  }
}
