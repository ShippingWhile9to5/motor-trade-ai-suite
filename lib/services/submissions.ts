import "server-only";

import {
  createSubmission,
  getSubmissionByCaseId,
  updateSubmission,
} from "../repositories/submissions";
import {
  createSubmissionInputSchema,
  getSubmissionByCaseIdInputSchema,
  updateSubmissionInputSchema,
} from "../schemas/submission";

export async function createSubmissionWorkflow(input: unknown) {
  const data = createSubmissionInputSchema.parse(input);

  return createSubmission(data);
}

export async function getSubmissionByCaseIdWorkflow(input: unknown) {
  const data = getSubmissionByCaseIdInputSchema.parse(input);

  return getSubmissionByCaseId(data);
}

export async function updateSubmissionWorkflow(input: unknown) {
  const data = updateSubmissionInputSchema.parse(input);

  return updateSubmission(data);
}
