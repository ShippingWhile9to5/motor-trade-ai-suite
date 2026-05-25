import "server-only";

import type { SubmissionProvider } from "./submission";

export const placeholderSubmissionText =
  "Submission draft placeholder. Approved review received; configure a submission provider to generate final draft text.";

export const factFindSubmissionProvider: SubmissionProvider = {
  async generate() {
    return placeholderSubmissionText;
  },
};
