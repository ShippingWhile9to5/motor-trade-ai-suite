"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { getCaseWorkflow } from "../../lib/services/cases";
import { listCaseDocumentsWorkflow } from "../../lib/services/storage";

const getCaseDocumentsActionInputSchema = z
  .object({
    case_id: z.string().uuid(),
  })
  .strict();

export async function getCaseDocumentsAction(input: unknown) {
  const user = await requireUser();
  const data = getCaseDocumentsActionInputSchema.parse(input);

  const userCase = await getCaseWorkflow({
    id: data.case_id,
    user_id: user.userId,
  });

  if (!userCase) {
    return [];
  }

  return listCaseDocumentsWorkflow({
    case_id: userCase.id,
  });
}
