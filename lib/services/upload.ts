import "server-only";

import { z } from "zod";
import { createDocumentMetadata } from "./documents";
import { createDocumentReferenceWorkflow } from "./storage";
import { validateUploadFile } from "../validation/files";

export const createUploadReferenceInputSchema = z
  .object({
    case_id: z.string().uuid(),
    file: z.instanceof(File),
  })
  .strict();

function buildStoragePath(caseId: string, file: File) {
  return `cases/${caseId}/${crypto.randomUUID()}-${file.name}`;
}

export async function createUploadReference(input: unknown) {
  const { case_id, file } = createUploadReferenceInputSchema.parse(input);
  const validation = validateUploadFile(file);

  if (!validation.success) {
    return {
      success: false as const,
      errors: validation.errors,
    };
  }

  const uploadedAt = new Date().toISOString();
  const metadata = await createDocumentMetadata({
    case_id,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    uploaded_at: uploadedAt,
  });

  const reference = await createDocumentReferenceWorkflow({
    ...metadata,
    storage_path: buildStoragePath(case_id, file),
  });

  return {
    success: true as const,
    metadata,
    reference,
  };
}
