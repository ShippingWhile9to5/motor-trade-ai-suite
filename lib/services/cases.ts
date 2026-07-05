import "server-only";

import { z } from "zod";
import {
  createCase,
  deleteCase,
  deleteCasesUpdatedBefore,
  getCaseById,
  listCasesForUser,
  updateCase,
} from "../repositories/cases";
import { caseStatusSchema } from "../schemas/case";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const purgeExpiredCasesServiceInputSchema = z
  .object({
    retention_days: z.number().int().positive(),
  })
  .strict();

/**
 * Deletes every case (any user) untouched for longer than the retention
 * window, so client data is purged automatically rather than relying on
 * anyone remembering to delete. See memory: secure-data-architecture.
 */
export async function purgeExpiredCasesWorkflow(input: unknown) {
  const { retention_days } = purgeExpiredCasesServiceInputSchema.parse(input);
  const cutoffIso = new Date(
    Date.now() - retention_days * DAY_IN_MS,
  ).toISOString();
  const deletedCount = await deleteCasesUpdatedBefore(cutoffIso);

  return {
    deleted_count: deletedCount,
    retention_days,
    cutoff: cutoffIso,
  };
}

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
