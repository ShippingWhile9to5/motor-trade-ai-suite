import { z } from "zod";

// The shape exported by the standalone Prospect Board (prospects-v1). Kept
// deliberately lenient: every field but the name is optional, and unknown keys
// are ignored, so an older or newer backup still imports.

const text = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => (value == null ? "" : String(value).trim()));

const importedDirectorSchema = z.object({
  name: text,
  role: text.default(""),
  appointed: text.default(""),
});

const importedActivitySchema = z.object({
  ts: text.default(""),
  type: text.default(""),
  note: text.default(""),
});

export const importedProspectSchema = z.object({
  name: z.string().trim().min(1, "Every imported record needs a name."),
  companyNumber: text.default(""),
  companyStatus: text.default(""),
  incorporated: text.default(""),
  location: text.default(""),
  address: text.default(""),
  directors: z.array(importedDirectorSchema).default([]),
  phone: text.default(""),
  mobile: text.default(""),
  email: text.default(""),
  website: text.default(""),
  franchise: text.default(""),
  services: text.default(""),
  profile: text.default(""),
  opportunity: text.default(""),
  approachAngle: text.default(""),
  rating: z.coerce.number().int().min(1).max(5).nullable().catch(null),
  pipelineStatus: text.default(""),
  followUp: text.default(""),
  notes: text.default(""),
  nextActionText: text.default(""),
  activities: z.array(importedActivitySchema).default([]),
});

export const importedProspectsSchema = z
  .array(importedProspectSchema)
  .min(1, "That backup contains no prospects.");

export type ImportedProspect = z.infer<typeof importedProspectSchema>;
export type ImportedActivity = z.infer<typeof importedActivitySchema>;
