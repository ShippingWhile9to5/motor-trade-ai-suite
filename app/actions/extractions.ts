"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { factFindProvider } from "../../lib/providers/fact-find-provider";
import { executeExtractionWorkflow } from "../../lib/services/extraction-execution";
import { getExtractionByCaseIdWorkflow } from "../../lib/services/extractions";
import { getCaseWorkflow } from "../../lib/services/cases";
import { getDocumentReferenceWorkflow } from "../../lib/services/storage";

const executeExtractionActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
    document_reference_id: z.string().uuid(),
  })
  .strict();

const getExtractionActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export async function executeExtractionAction(input: unknown) {
  const user = await requireUser();
  const data = executeExtractionActionInputSchema.parse(input);

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return {
      success: false as const,
      error: "Case or document not found.",
    };
  }

  const documentReference = await getDocumentReferenceWorkflow({
    id: data.document_reference_id,
  });

  if (!documentReference || documentReference.case_id !== userCase.id) {
    return {
      success: false as const,
      error: "Case or document not found.",
    };
  }

  try {
    return await executeExtractionWorkflow(
      {
        document_reference_id: documentReference.id,
        user_id: user.userId,
      },
      factFindProvider,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction could not be created.";

    return {
      success: false as const,
      error:
        process.env.NODE_ENV === "production"
          ? "Extraction could not be created."
          : message,
    };
  }
}

export async function getExtractionAction(input: unknown) {
  const user = await requireUser();
  const data = getExtractionActionInputSchema.parse(input);

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return null;
  }

  return getExtractionByCaseIdWorkflow({
    case_id: userCase.id,
    user_id: user.userId,
  });
}
