import "server-only";

import { z } from "zod";
import type {
  ExtractionProvider,
  ExtractionSourceFile,
} from "../providers/extraction";
import { createExtractionResultWorkflow } from "./extraction-orchestrator";

export const runFactFindExtractionWorkflowInputSchema = z
  .object({
    case_id: z.string().uuid(),
    document_id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

/**
 * Runs extraction over the in-memory fact-find pages and persists only the
 * structured result. The page bytes are never stored — see memory:
 * secure-data-architecture (never-store-the-image).
 */
export async function runFactFindExtractionWorkflow(
  input: unknown,
  files: ExtractionSourceFile[],
  provider: ExtractionProvider,
) {
  const data = runFactFindExtractionWorkflowInputSchema.parse(input);
  const extractionPayload = await provider.extract(files);

  return createExtractionResultWorkflow({
    case_id: data.case_id,
    document_id: data.document_id,
    user_id: data.user_id,
    raw_result_json: extractionPayload,
  });
}
