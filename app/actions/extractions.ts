"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { getExtractionByCaseIdWorkflow } from "../../lib/services/extractions";
import { getCaseWorkflow } from "../../lib/services/cases";

const getExtractionActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export async function getExtractionAction(input: unknown) {
  const user = await requireUser();
  const data = getExtractionActionInputSchema.parse(input);

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return null;
  }

  return getExtractionByCaseIdWorkflow({
    case_id: userCase.id,
    user_id: user.userId,
  });
}
