"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import { createCaseWorkflow } from "../../lib/services/cases";

const createCaseActionInputSchema = z
  .object({
    client_name: z.string().min(1),
  })
  .strict();

export async function createCaseAction(input: unknown) {
  const user = await requireUser();
  const data = createCaseActionInputSchema.parse(input);

  return createCaseWorkflow({
    user_id: user.userId,
    client_name: data.client_name,
  });
}
