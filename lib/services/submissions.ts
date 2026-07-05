import "server-only";

import {
  createSubmission,
  getSubmissionByCaseId,
  saveComposerState,
  updateSubmission,
} from "../repositories/submissions";
import {
  createSubmissionInputSchema,
  getSubmissionByCaseIdInputSchema,
  saveSubmissionComposerStateInputSchema,
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

export async function saveSubmissionComposerStateWorkflow(input: unknown) {
  const data = saveSubmissionComposerStateInputSchema.parse(input);

  return saveComposerState(data);
}
