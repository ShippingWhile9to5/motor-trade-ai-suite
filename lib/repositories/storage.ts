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
const mixedDocumentSelect =
  "id,case_id,file_name,mime_type,size_bytes,storage_path,created_at";
const legacyDocumentSelect =
  "id,case_id,file_name,file_type,file_size,storage_path,uploaded_at";
const filePathDocumentSelect =
  "id,case_id,file_name,mime_type,size_bytes,file_path,created_at";
const contentTypeDocumentSelect =
  "id,case_id,file_name,content_type,file_size,file_path,created_at";

const documentReadCandidates = [
  { select: documentSelect, orderBy: "created_at" },
  { select: mixedDocumentSelect, orderBy: "created_at" },
  { select: filePathDocumentSelect, orderBy: "created_at" },
  { select: contentTypeDocumentSelect, orderBy: "created_at" },
  { select: legacyDocumentSelect, orderBy: "uploaded_at" },
];

type DocumentRow = {
  id: string;
  case_id: string;
  filename?: string;
  file_name?: string;
  mime_type?: string;
  file_type?: string;
  content_type?: string;
  size_bytes?: number;
  file_size?: number;
  storage_path?: string;
  file_path?: string;
  created_at?: string;
  uploaded_at?: string;
};

function parseDocumentRow(row: DocumentRow): DocumentReference {
  return documentReferenceSchema.parse({
    id: row.id,
    case_id: row.case_id,
    file_name: row.filename ?? row.file_name,
    file_type: row.mime_type ?? row.file_type ?? row.content_type,
    file_size: row.size_bytes ?? row.file_size,
    storage_path: row.storage_path ?? row.file_path,
    uploaded_at: row.created_at ?? row.uploaded_at,
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

function tryParseDocumentRow(row: DocumentRow) {
  const parsed = documentReferenceSchema.safeParse({
    id: row.id,
    case_id: row.case_id,
    file_name: row.filename ?? row.file_name,
    file_type: row.mime_type ?? row.file_type ?? row.content_type,
    file_size: row.size_bytes ?? row.file_size,
    storage_path: row.storage_path ?? row.file_path,
    uploaded_at: row.created_at ?? row.uploaded_at,
  });

  return parsed.success ? parsed.data : null;
}

function parseReadableDocumentRows(rows: DocumentRow[] | null) {
  const documents = rows?.map(tryParseDocumentRow).filter(Boolean) ?? [];

  return documents as DocumentReference[];
}

function needsLegacyDocumentColumns(error: { message: string } | null) {
  return Boolean(
    error?.message.includes("file_name") ||
      error?.message.includes("file_type") ||
      error?.message.includes("content_type") ||
      error?.message.includes("file_size") ||
      error?.message.includes("file_path") ||
      error?.message.includes("uploaded_at"),
  );
}

function isMissingColumn(error: { message: string } | null, column: string) {
  return Boolean(error?.message.includes(`'${column}' column`));
}

export async function createDocumentReference(
  input: unknown,
): Promise<DocumentReference> {
  const data = createDocumentReferenceInputSchema.parse(input);
  let { data: row, error } = await supabase
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

  if (needsLegacyDocumentColumns(error)) {
    const retry = isMissingColumn(error, "file_name")
      ? await supabase
          .from("documents")
          .insert({
            case_id: data.case_id,
            user_id: data.user_id,
            file_name: data.file_name,
            mime_type: data.file_type,
            size_bytes: data.file_size,
            storage_path: data.storage_path,
            status: "uploaded",
          })
          .select(mixedDocumentSelect)
          .single<DocumentRow>()
      : await supabase
          .from("documents")
          .insert({
            case_id: data.case_id,
            user_id: data.user_id,
            file_name: data.file_name,
            file_type: data.file_type,
            file_size: data.file_size,
            storage_path: data.storage_path,
            uploaded_at: new Date().toISOString(),
          })
          .select(legacyDocumentSelect)
          .single<DocumentRow>();

    row = retry.data;
    error = retry.error;
  }

  if (isMissingColumn(error, "file_type")) {
    const retry = await supabase
      .from("documents")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        file_name: data.file_name,
        mime_type: data.file_type,
        size_bytes: data.file_size,
        storage_path: data.storage_path,
        status: "uploaded",
      })
      .select(mixedDocumentSelect)
      .single<DocumentRow>();

    row = retry.data;
    error = retry.error;
  }

  if (
    error?.message.includes("file_path") &&
    error.message.includes("violates not-null constraint")
  ) {
    const retry = await supabase
      .from("documents")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        file_name: data.file_name,
        mime_type: data.file_type,
        size_bytes: data.file_size,
        file_path: data.storage_path,
        status: "uploaded",
      })
      .select(filePathDocumentSelect)
      .single<DocumentRow>();

    row = retry.data;
    error = retry.error;
  }

  if (
    error?.message.includes("content_type") &&
    error.message.includes("violates not-null constraint")
  ) {
    const retry = await supabase
      .from("documents")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        file_name: data.file_name,
        content_type: data.file_type,
        file_size: data.file_size,
        file_path: data.storage_path,
        status: "uploaded",
      })
      .select(contentTypeDocumentSelect)
      .single<DocumentRow>();

    row = retry.data;
    error = retry.error;
  }

  throwSupabaseError(error);

  return parseDocumentRow(assertDocumentRow(row));
}

export async function getDocumentReference(
  input: unknown,
): Promise<DocumentReference | null> {
  const { id } = getDocumentReferenceInputSchema.parse(input);
  let lastError: { message: string } | null = null;

  for (const candidate of documentReadCandidates) {
    const { data: row, error } = await supabase
      .from("documents")
      .select(candidate.select)
      .eq("id", id)
      .maybeSingle<DocumentRow>();

    if (error) {
      lastError = error;
      continue;
    }

    if (!row) {
      return null;
    }

    const document = tryParseDocumentRow(row);

    if (document) {
      return document;
    }
  }

  throwSupabaseError(lastError);

  return null;
}

export async function listCaseDocuments(
  input: unknown,
): Promise<DocumentReference[]> {
  const { case_id } = listCaseDocumentsInputSchema.parse(input);
  let lastError: { message: string } | null = null;

  for (const candidate of documentReadCandidates) {
    const { data: rows, error } = await supabase
      .from("documents")
      .select(candidate.select)
      .eq("case_id", case_id)
      .order(candidate.orderBy, { ascending: false })
      .returns<DocumentRow[]>();

    if (error) {
      lastError = error;
      continue;
    }

    const documents = parseReadableDocumentRows(rows ?? []);

    if (documents.length > 0 || rows?.length === 0) {
      return documents;
    }
  }

  throwSupabaseError(lastError);

  return [];
}
