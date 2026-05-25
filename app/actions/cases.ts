"use server";

import { z } from "zod";
import { requireUser } from "../../lib/auth";
import {
  createCaseWorkflow,
  getCaseWorkflow,
  listCasesForUserWorkflow,
  updateCaseWorkflow,
} from "../../lib/services/cases";
import { caseStatusSchema } from "../../lib/schemas/case";

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

const updateCaseActionInputSchema = z
  .object({
    id: z.string().uuid(),
    client_name: z.string().min(1).optional(),
    status: caseStatusSchema.optional(),
  })
  .strict()
  .refine((input) => input.client_name !== undefined || input.status !== undefined, {
    message: "At least one case field must be provided for update.",
  });

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

export async function updateCaseAction(input: unknown) {
  const user = await requireUser();
  const data = updateCaseActionInputSchema.parse(input);

  return updateCaseWorkflow({
    ...data,
    user_id: user.userId,
  });
}
