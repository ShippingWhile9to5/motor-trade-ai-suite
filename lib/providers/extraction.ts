import "server-only";

import type { DocumentReference } from "../schemas/document";
import type { FactFindExtraction } from "../schemas/extraction";

export interface ExtractionProvider {
  extract(document: DocumentReference): Promise<FactFindExtraction>;
}
