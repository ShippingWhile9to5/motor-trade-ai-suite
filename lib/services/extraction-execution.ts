import "server-only";

import { z } from "zod";
import type { ExtractionProvider } from "../providers/extraction";
import { createExtractionResultWorkflow } from "./extraction-orchestrator";
import { getDocumentReferenceWorkflow } from "./storage";

export const executeExtractionWorkflowInputSchema = z
  .object({
    document_reference_id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

export async function executeExtractionWorkflow(
  input: unknown,
  provider: ExtractionProvider,
) {
  const data = executeExtractionWorkflowInputSchema.parse(input);
  const documentReference = await getDocumentReferenceWorkflow({
    id: data.document_reference_id,
  });

  if (!documentReference) {
    return {
      success: false as const,
      error: "Document reference not found.",
    };
  }

  const extractionPayload = await provider.extract(documentReference);

  return createExtractionResultWorkflow({
    case_id: documentReference.case_id,
    document_id: documentReference.id,
    user_id: data.user_id,
    raw_result_json: extractionPayload,
  });
}
