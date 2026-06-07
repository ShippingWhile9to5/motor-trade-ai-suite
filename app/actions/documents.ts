"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { getCaseWorkflow } from "../../lib/services/cases";
import { createUploadReference } from "../../lib/services/upload";
import { listCaseDocumentsWorkflow } from "../../lib/services/storage";

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
