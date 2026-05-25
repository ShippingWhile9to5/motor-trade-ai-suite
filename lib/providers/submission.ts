import "server-only";

import type { ExtractionReview } from "../schemas/review";

export interface SubmissionProvider {
  generate(review: ExtractionReview): Promise<string>;
}
