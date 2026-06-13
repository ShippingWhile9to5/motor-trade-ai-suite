import "server-only";

import { z } from "zod";
import {
  createCase,
  deleteCase,
  getCaseById,
  listCasesForUser,
  updateCase,
} from "../repositories/cases";
import { caseStatusSchema } from "../schemas/case";

export const createCaseServiceInputSchema = z
  .object({
    user_id: z.string().min(1),
    client_name: z.string().min(1),
  })
  .strict();

export const getCaseByIdServiceInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

export const listCasesForUserServiceInputSchema = z
  .object({
    user_id: z.string().min(1),
  })
  .strict();

export const deleteCaseServiceInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

export const updateCaseServiceInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
    client_name: z.string().min(1).optional(),
    status: caseStatusSchema.optional(),
  })
  .strict()
  .refine((input) => input.client_name !== undefined || input.status !== undefined, {
    message: "At least one case field must be provided for update.",
  });

export async function createCaseWorkflow(input: unknown) {
  const data = createCaseServiceInputSchema.parse(input);

  return createCase({
    ...data,
    status: "draft",
  });
}

export async function getCaseWorkflow(input: unknown) {
  const data = getCaseByIdServiceInputSchema.parse(input);

  return getCaseById(data);
}

export async function listCasesForUserWorkflow(input: unknown) {
  const data = listCasesForUserServiceInputSchema.parse(input);

  return listCasesForUser(data);
}

export async function deleteCaseWorkflow(input: unknown) {
  const data = deleteCaseServiceInputSchema.parse(input);

  return deleteCase(data);
}

export async function updateCaseWorkflow(input: unknown) {
  const data = updateCaseServiceInputSchema.parse(input);

  return updateCase(data);
}
