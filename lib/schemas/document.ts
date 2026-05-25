import { z } from "zod";

export const documentMetadataSchema = z
  .object({
    case_id: z.string().uuid(),
    file_name: z.string().min(1),
    file_type: z.string().min(1),
    file_size: z.number().int().positive(),
    uploaded_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const documentReferenceSchema = documentMetadataSchema
  .extend({
    id: z.string().uuid(),
    storage_path: z.string().min(1),
  })
  .strict();

export const createDocumentReferenceInputSchema = documentReferenceSchema.omit({
  id: true,
  uploaded_at: true,
});

export const getDocumentReferenceInputSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const listCaseDocumentsInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type DocumentReference = z.infer<typeof documentReferenceSchema>;
