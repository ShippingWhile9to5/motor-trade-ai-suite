import "server-only";

import {
  type DocumentReference,
  createDocumentReferenceInputSchema,
  documentReferenceSchema,
  getDocumentReferenceInputSchema,
  listCaseDocumentsInputSchema,
} from "../schemas/document";
import { supabase } from "../supabase";

const documentSelect =
  "id,case_id,filename,mime_type,size_bytes,storage_path,created_at";

type DocumentRow = {
  id: string;
  case_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
};

function parseDocumentRow(row: DocumentRow): DocumentReference {
  return documentReferenceSchema.parse({
    id: row.id,
    case_id: row.case_id,
    file_name: row.filename,
    file_type: row.mime_type,
    file_size: row.size_bytes,
    storage_path: row.storage_path,
    uploaded_at: row.created_at,
  });
}

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function assertDocumentRow(row: DocumentRow | null): DocumentRow {
  if (!row) {
    throw new Error("Document reference was not returned.");
  }

  return row;
}

export async function createDocumentReference(
  input: unknown,
): Promise<DocumentReference> {
  const data = createDocumentReferenceInputSchema.parse(input);
  const { data: row, error } = await supabase
    .from("documents")
    .insert({
      case_id: data.case_id,
      user_id: data.user_id,
      filename: data.file_name,
      mime_type: data.file_type,
      size_bytes: data.file_size,
      storage_path: data.storage_path,
      status: "uploaded",
    })
    .select(documentSelect)
    .single<DocumentRow>();

  throwSupabaseError(error);

  return parseDocumentRow(assertDocumentRow(row));
}

export async function getDocumentReference(
  input: unknown,
): Promise<DocumentReference | null> {
  const { id } = getDocumentReferenceInputSchema.parse(input);
  const { data: row, error } = await supabase
    .from("documents")
    .select(documentSelect)
    .eq("id", id)
    .maybeSingle<DocumentRow>();

  throwSupabaseError(error);

  return row ? parseDocumentRow(row) : null;
}

export async function listCaseDocuments(
  input: unknown,
): Promise<DocumentReference[]> {
  const { case_id } = listCaseDocumentsInputSchema.parse(input);
  const { data: rows, error } = await supabase
    .from("documents")
    .select(documentSelect)
    .eq("case_id", case_id)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  throwSupabaseError(error);

  return (rows ?? []).map(parseDocumentRow);
}
