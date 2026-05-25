import "server-only";

import {
  type DocumentReference,
  createDocumentReferenceInputSchema,
  documentReferenceSchema,
  getDocumentReferenceInputSchema,
  listCaseDocumentsInputSchema,
} from "../schemas/document";

const documentReferences = new Map<string, DocumentReference>();

export async function createDocumentReference(
  input: unknown,
): Promise<DocumentReference> {
  const data = createDocumentReferenceInputSchema.parse(input);
  const reference = documentReferenceSchema.parse({
    ...data,
    id: crypto.randomUUID(),
    uploaded_at: new Date().toISOString(),
  });

  documentReferences.set(reference.id, reference);

  return reference;
}

export async function getDocumentReference(
  input: unknown,
): Promise<DocumentReference | null> {
  const { id } = getDocumentReferenceInputSchema.parse(input);

  return documentReferences.get(id) ?? null;
}

export async function listCaseDocuments(
  input: unknown,
): Promise<DocumentReference[]> {
  const { case_id } = listCaseDocumentsInputSchema.parse(input);

  return Array.from(documentReferences.values()).filter(
    (reference) => reference.case_id === case_id,
  );
}
