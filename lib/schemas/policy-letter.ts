import { z } from "zod";

export const extractedPolicyDataSchema = z.object({
  // Each excess is a single ready-to-paste line, e.g. "Material Damage - £350".
  excesses: z.array(z.string()),
  exclusions: z.array(z.string()),
  endorsementsAndConditions: z.array(z.string()),
  driverBasis: z.string(),
  businessDescription: z.string(),
  coverIncluded: z.array(z.string()),
  coverNotIncluded: z.array(z.string()),
});

export const extractPolicyDataResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: extractedPolicyDataSchema }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type ExtractedPolicyData = z.infer<typeof extractedPolicyDataSchema>;
export type ExtractPolicyDataResult = z.infer<
  typeof extractPolicyDataResultSchema
>;
