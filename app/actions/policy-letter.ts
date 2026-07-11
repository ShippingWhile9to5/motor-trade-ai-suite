"use server";

import { requireUser } from "../../lib/auth";
import { extractPolicyScheduleWorkflow } from "../../lib/services/policy-letter-extraction";
import type { ExtractPolicyDataResult } from "../../lib/schemas/policy-letter";

export async function extractPolicyScheduleAction(
  formData: FormData,
): Promise<ExtractPolicyDataResult> {
  await requireUser();

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }

  return extractPolicyScheduleWorkflow(file);
}
