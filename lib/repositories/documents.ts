import "server-only";

import {
  type DocumentMetadata,
  documentMetadataSchema,
} from "../schemas/document";

export async function saveDocumentMetadata(
  metadata: DocumentMetadata,
): Promise<DocumentMetadata> {
  return documentMetadataSchema.parse(metadata);
}
