import "server-only";

import {
  createExtraction,
  getExtractionByCaseId,
  updateExtraction,
} from "../repositories/extractions";
import {
  createExtractionInputSchema,
  getExtractionByCaseIdInputSchema,
  updateExtractionInputSchema,
} from "../schemas/extraction";

export async function createExtractionWorkflow(input: unknown) {
  const data = createExtractionInputSchema.parse(input);

  return createExtraction(data);
}

export async function getExtractionByCaseIdWorkflow(input: unknown) {
  const data = getExtractionByCaseIdInputSchema.parse(input);

  return getExtractionByCaseId(data);
}

export async function updateExtractionWorkflow(input: unknown) {
  const data = updateExtractionInputSchema.parse(input);

  return updateExtraction(data);
}
