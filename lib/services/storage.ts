import "server-only";

import {
  createDocumentReference,
  getDocumentReference,
  listCaseDocuments,
} from "../repositories/storage";
import {
  createDocumentReferenceInputSchema,
  getDocumentReferenceInputSchema,
  listCaseDocumentsInputSchema,
} from "../schemas/document";

export async function createDocumentReferenceWorkflow(input: unknown) {
  const data = createDocumentReferenceInputSchema.parse(input);

  return createDocumentReference(data);
}

export async function getDocumentReferenceWorkflow(input: unknown) {
  const data = getDocumentReferenceInputSchema.parse(input);

  return getDocumentReference(data);
}

export async function listCaseDocumentsWorkflow(input: unknown) {
  const data = listCaseDocumentsInputSchema.parse(input);

  return listCaseDocuments(data);
}
