import { z } from "zod";

export const extractionFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const extractionFieldSchema = z
  .object({
    value: extractionFieldValueSchema,
    confidence: z.number().min(0).max(1),
    source_reference: z.string(),
    requires_review: z.boolean(),
    is_missing_required: z.boolean(),
  })
  .strict();

const businessDetailsSchema = z
  .object({
    client_name: extractionFieldSchema,
    trading_name: extractionFieldSchema,
    business_type: extractionFieldSchema,
    contact_name: extractionFieldSchema,
    email: extractionFieldSchema,
    phone: extractionFieldSchema,
  })
  .strict();

const premisesSchema = z
  .object({
    address: extractionFieldSchema,
    occupancy: extractionFieldSchema,
    construction: extractionFieldSchema,
    heating: extractionFieldSchema,
    neighbouring_trades: extractionFieldSchema,
  })
  .strict();

const securitySchema = z
  .object({
    alarms: extractionFieldSchema,
    cctv: extractionFieldSchema,
    locks: extractionFieldSchema,
    gates: extractionFieldSchema,
    key_security: extractionFieldSchema,
  })
  .strict();

const vehiclesAndStockSchema = z
  .object({
    stock_value: extractionFieldSchema,
    vehicle_types: extractionFieldSchema,
    own_vehicles: extractionFieldSchema,
    demonstration_use: extractionFieldSchema,
    trade_plates: extractionFieldSchema,
    overnight_location: extractionFieldSchema,
  })
  .strict();

const driverSchema = z
  .object({
    name: extractionFieldSchema,
    date_of_birth: extractionFieldSchema,
    licence_type: extractionFieldSchema,
    occupation: extractionFieldSchema,
    convictions: extractionFieldSchema,
  })
  .strict();

const claimSchema = z
  .object({
    date: extractionFieldSchema,
    description: extractionFieldSchema,
    cost: extractionFieldSchema,
    status: extractionFieldSchema,
  })
  .strict();

const claimsHistorySchema = z
  .object({
    has_claims: extractionFieldSchema,
    no_claims_bonus: extractionFieldSchema,
    claims: z.array(claimSchema),
  })
  .strict();

const currentInsuranceSchema = z
  .object({
    insurer: extractionFieldSchema,
    policy_number: extractionFieldSchema,
    renewal_date: extractionFieldSchema,
    premium: extractionFieldSchema,
    covers_held: extractionFieldSchema,
  })
  .strict();

const coverRequiredSchema = z
  .object({
    road_risks: extractionFieldSchema,
    public_liability: extractionFieldSchema,
    employers_liability: extractionFieldSchema,
    material_damage: extractionFieldSchema,
    business_interruption: extractionFieldSchema,
    requested_start_date: extractionFieldSchema,
  })
  .strict();

export const factFindExtractionSchema = z
  .object({
    business_details: businessDetailsSchema,
    premises: premisesSchema,
    security: securitySchema,
    vehicles_and_stock: vehiclesAndStockSchema,
    drivers: z.array(driverSchema),
    claims_history: claimsHistorySchema,
    current_insurance: currentInsuranceSchema,
    cover_required: coverRequiredSchema,
  })
  .strict();

export type ExtractionField = z.infer<typeof extractionFieldSchema>;
export type FactFindExtraction = z.infer<typeof factFindExtractionSchema>;
