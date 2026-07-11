import "server-only";

import { extractPolicyScheduleData } from "../providers/policy-schedule-extraction-provider";
import { validatePolicyScheduleFile } from "../validation/policy-letter";
import type { ExtractPolicyDataResult } from "../schemas/policy-letter";

export async function extractPolicyScheduleWorkflow(
  file: File,
): Promise<ExtractPolicyDataResult> {
  const validationError = validatePolicyScheduleFile(file);

  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const data = await extractPolicyScheduleData(base64);

    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown extraction error.";

    return { success: false, error: message };
  }
}
