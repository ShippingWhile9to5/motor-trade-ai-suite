import "server-only";

import {
  type Submission,
  createSubmissionInputSchema,
  getSubmissionByCaseIdInputSchema,
  submissionSchema,
  updateSubmissionInputSchema,
} from "../schemas/submission";

const submissions = new Map<string, Submission>();

export async function createSubmission(input: unknown): Promise<Submission> {
  const data = createSubmissionInputSchema.parse(input);
  const submission = submissionSchema.parse({
    ...data,
    created_at: new Date().toISOString(),
  });

  submissions.set(submission.case_id, submission);

  return submission;
}

export async function getSubmissionByCaseId(
  input: unknown,
): Promise<Submission | null> {
  const { case_id } = getSubmissionByCaseIdInputSchema.parse(input);

  return submissions.get(case_id) ?? null;
}

export async function updateSubmission(
  input: unknown,
): Promise<Submission | null> {
  const data = updateSubmissionInputSchema.parse(input);
  const { case_id, ...updates } = data;
  const existingSubmission = submissions.get(case_id);

  if (!existingSubmission) {
    return null;
  }

  const submission = submissionSchema.parse({
    ...existingSubmission,
    ...updates,
  });

  submissions.set(case_id, submission);

  return submission;
}
