import "server-only";

import {
  type Business,
  type CreateBusinessInput,
  createBusinessInputSchema,
  updateBusinessInputSchema,
} from "../schemas/business";
import { importedProspectsSchema } from "../schemas/prospect-import";
import { importedProspectToBusinessInput } from "../prospect-board";
import {
  createBusiness,
  deleteBusiness,
  findBusinessByCompanyNumber,
  findBusinessByName,
  getBusinessById,
  listBusinesses,
  updateBusiness,
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

export async function updateBusinessWorkflow(
  userId: string,
  input: unknown,
): Promise<Business | null> {
  const { id, ...parsed } = updateBusinessInputSchema.parse(input);

  // Write only what was supplied, so a single-field edit cannot blank the
  // fields it never touched.
  const changes = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  );

  // Nothing to write: return the record as it stands, so a no-op edit is not
  // reported to the caller as a missing record.
  if (Object.keys(changes).length === 0) {
    return getBusinessById(userId, id);
  }

  // Setting a call-back date means you have spoken to them, so the firm stops
  // being one you still need to contact. Only ever promotes from "prospect",
  // and never overrides a status set in the same edit.
  if (changes.follow_up && changes.pipeline_status === undefined) {
    const existing = await getBusinessById(userId, id);

    if (existing?.pipeline_status === "prospect") {
      changes.pipeline_status = "contacted";
    }
  }

  return updateBusiness(userId, id, changes);
}

export async function deleteBusinessWorkflow(
  userId: string,
  input: unknown,
): Promise<void> {
  const { id } = updateBusinessInputSchema.pick({ id: true }).parse(input);

  await deleteBusiness(userId, id);
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

export type ImportProspectsResult = {
  imported: Business[];
  skipped: { name: string; reason: string }[];
};

// Import a backup from the standalone Prospect Board. Deduplicates on company
// number, falling back to name, so re-running an import is safe: an existing
// record is left untouched rather than duplicated or overwritten.
export async function importProspectsWorkflow(
  userId: string,
  input: unknown,
): Promise<ImportProspectsResult> {
  const records = importedProspectsSchema.parse(input);
  const result: ImportProspectsResult = { imported: [], skipped: [] };

  for (const record of records) {
    const data = importedProspectToBusinessInput(record);

    const existing = data.company_number
      ? await findBusinessByCompanyNumber(userId, data.company_number)
      : await findBusinessByName(userId, data.name);

    if (existing) {
      result.skipped.push({ name: record.name, reason: "Already saved" });
      continue;
    }

    result.imported.push(await createBusiness(userId, data));
  }

  return result;
}
