"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import {
  createCaseWorkflow,
  getCaseWorkflow,
  listCasesForUserWorkflow,
} from "../../lib/services/cases";

const createCaseActionInputSchema = z
  .object({
    client_name: z.string().min(1),
  })
  .strict();

const getCaseActionInputSchema = z
  .object({
    id: z.string().uuid(),
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

export async function getCaseAction(input: unknown) {
  const user = await requireUser();
  const data = getCaseActionInputSchema.parse(input);

  return getCaseWorkflow({
    id: data.id,
    user_id: user.userId,
  });
}

export async function listCasesAction() {
  const user = await requireUser();

  return listCasesForUserWorkflow({
    user_id: user.userId,
  });
}
