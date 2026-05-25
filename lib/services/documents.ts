import "server-only";

import { saveDocumentMetadata } from "../repositories/documents";
import { documentMetadataSchema } from "../schemas/document";

export async function createDocumentMetadata(input: unknown) {
  const metadata = documentMetadataSchema.parse(input);

  return saveDocumentMetadata(metadata);
}
