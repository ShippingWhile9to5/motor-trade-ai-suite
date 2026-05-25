import "server-only";

import { z } from "zod";
import { createExtractionWorkflow } from "./extractions";
import { getGroupedMissingExtractionFields } from "../validation/extraction";

export const createExtractionResultWorkflowInputSchema = z
  .object({
    case_id: z.string().uuid(),
    document_id: z.string().uuid(),
    user_id: z.string().min(1),
    raw_result_json: z.unknown(),
  })
  .strict();

export async function createExtractionResultWorkflow(input: unknown) {
  const data = createExtractionResultWorkflowInputSchema.parse(input);
  const missingFields = getGroupedMissingExtractionFields(data.raw_result_json);

  if (!missingFields.success) {
    return missingFields;
  }

  const extraction = await createExtractionWorkflow({
    case_id: data.case_id,
    document_id: data.document_id,
    user_id: data.user_id,
    status: "review_required",
    raw_result_json: data.raw_result_json,
  });

  return {
    success: true as const,
    extraction,
    missing_required_fields: missingFields.missing_required_fields,
  };
}
