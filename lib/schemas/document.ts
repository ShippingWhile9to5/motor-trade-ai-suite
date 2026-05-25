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

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
