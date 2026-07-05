import "server-only";

import { z } from "zod";
import {
  createExtractionWorkflow,
  getExtractionByCaseIdWorkflow,
  updateExtractionWorkflow,
} from "./extractions";
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

  const existingExtraction = await getExtractionByCaseIdWorkflow({
    case_id: data.case_id,
    user_id: data.user_id,
  });
  const extraction = existingExtraction
    ? await updateExtractionWorkflow({
        id: existingExtraction.id,
        user_id: data.user_id,
        status: "review_required",
        raw_result_json: data.raw_result_json,
        reviewed_result_json: null,
        error_message: null,
      })
    : await createExtractionWorkflow({
        case_id: data.case_id,
        document_id: data.document_id,
        user_id: data.user_id,
        status: "review_required",
        raw_result_json: data.raw_result_json,
      });

  if (!extraction) {
    throw new Error("Extraction could not be created.");
  }

  return {
    success: true as const,
    extraction,
    missing_required_fields: missingFields.missing_required_fields,
  };
}

export const createExtractionFailureWorkflowInputSchema = z
  .object({
    case_id: z.string().uuid(),
    document_id: z.string().uuid(),
    user_id: z.string().min(1),
    error_message: z.string().min(1),
  })
  .strict();

// A failed attempt must be persisted with its own status/error_message,
// otherwise a failed case is indistinguishable from one where extraction was
// never attempted at all.
export async function createExtractionFailureWorkflow(input: unknown) {
  const data = createExtractionFailureWorkflowInputSchema.parse(input);

  const existingExtraction = await getExtractionByCaseIdWorkflow({
    case_id: data.case_id,
    user_id: data.user_id,
  });

  return existingExtraction
    ? updateExtractionWorkflow({
        id: existingExtraction.id,
        user_id: data.user_id,
        status: "failed",
        error_message: data.error_message,
      })
    : createExtractionWorkflow({
        case_id: data.case_id,
        document_id: data.document_id,
        user_id: data.user_id,
        status: "failed",
        error_message: data.error_message,
      });
}
