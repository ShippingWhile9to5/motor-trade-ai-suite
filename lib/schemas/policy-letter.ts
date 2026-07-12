import { z } from "zod";

export const excessSchema = z.object({
  category: z.string(),
  amount: z.string(),
  description: z.string().optional(),
});

export const extractedPolicyDataSchema = z.object({
  excesses: z.array(excessSchema),
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

export type Excess = z.infer<typeof excessSchema>;
export type ExtractedPolicyData = z.infer<typeof extractedPolicyDataSchema>;
export type ExtractPolicyDataResult = z.infer<
  typeof extractPolicyDataResultSchema
>;
