import "server-only";

import {
  type Business,
  type CreateBusinessInput,
  createBusinessInputSchema,
} from "../schemas/business";
import {
  createBusiness,
  findBusinessByName,
  listBusinesses,
} from "../repositories/businesses";

export async function listBusinessesWorkflow(
  userId: string,
): Promise<Business[]> {
  return listBusinesses(userId);
}

export async function createBusinessWorkflow(
  userId: string,
  input: unknown,
): Promise<Business> {
  const data = createBusinessInputSchema.parse(input);

  return createBusiness(userId, data);
}

// Reuse an existing business with the same name, or create a new one. Keeps a
// client entered once: typing "Brookway Cars" on a quote finds the prospect
// you already saved instead of duplicating it.
export async function findOrCreateBusinessByName(
  userId: string,
  name: string,
  defaults: Partial<CreateBusinessInput> = {},
): Promise<Business> {
  const existing = await findBusinessByName(userId, name);

  if (existing) {
    return existing;
  }

  return createBusinessWorkflow(userId, { name, ...defaults });
}
