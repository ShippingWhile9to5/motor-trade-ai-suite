import "server-only";

import type { FactFindExtraction } from "../schemas/extraction";

/**
 * A fact-find page held in memory for extraction. The bytes are never
 * persisted — they are sent to the AI provider and then discarded.
 * See memory: secure-data-architecture (never-store-the-image).
 */
export type ExtractionSourceFile = {
  file_name: string;
  /** image/jpeg, image/png, image/webp, image/gif, or application/pdf */
  media_type: string;
  data_base64: string;
};

export interface ExtractionProvider {
  extract(files: ExtractionSourceFile[]): Promise<FactFindExtraction>;
}
