import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../../env";
import type { ExtractionProvider, ExtractionSourceFile } from "./extraction";
import {
  type ExtractionField,
  type FactFindExtraction,
  factFindExtractionSchema,
} from "../schemas/extraction";

// Confidence below this is surfaced to the reviewer as "needs a look" (amber).
const REVIEW_CONFIDENCE_THRESHOLD = 0.85;
const EXTRACTION_MODEL = "claude-opus-4-8";

// Single source of truth for the fact-find field layout. Keys must match
// lib/schemas/extraction.ts exactly — the final factFindExtractionSchema.parse()
// is the guard that catches any drift.
const SCALAR_SECTIONS = {
  company_details: [
    "proposer",
    "company_name",
    "address",
    "postcode",
    "phone",
    "email",
    "renewal_date",
    "date_business_was_established",
    "business_description",
  ],
  premises_details: [
    "year_premises_was_built",
    "how_long_at_premises",
    "electrics_checked",
    "electrics_last_checked",
    "walls",
    "roof",
    "floors",
    "portable_heating",
    "fixed_heating",
    "intruder_alarm",
    "alarm_maintained",
    "fire_alarm",
    "additional_security_details_at_premises",
  ],
  business_activities: [
    "service_and_repair",
    "mot",
    "tyres",
    "vehicle_sales",
    "new_vehicles",
    "used_vehicles",
    "bodywork",
    "spray_booth",
    "lpc_approved",
    "paint_thinner_stored_in_metal_container",
    "welding_percentage",
    "type_of_welding",
    "additional_trade_activities",
    "business_hours_mon_to_fri",
    "business_hours_sat_to_sun",
  ],
  sums_insured_and_covers: [
    "buildings_sum_insured",
    "portable_hand_tools",
    "machinery_and_plant",
    "electronic_business_equipment",
    "goods_in_transit",
    "annual_cash_carryings",
    "any_other_loss_of_money",
    "annual_gross_profit",
    "business_interruption_indemnity_period_months",
    "annual_turnover",
    "stock_sum_insured",
    "own_vehicles_sum_insured",
    "customers_vehicles_sum_insured",
    "all_other_contents",
    "fuel_in_tanks",
    "cash_in_safe",
    "number_of_vehicles_in_custody_or_control",
    "normal_max_vehicle_value",
    "normal_average_vehicle_value",
    "public_liability_limit",
    "sales_indemnity_limit",
    "employers_liability_required",
    "employers_liability_limit",
    "floating_cover_required",
    "additional_location_address",
  ],
  turnover_split: [
    "turnover_vehicle_sales_used",
    "turnover_vehicle_sales_new",
    "turnover_service_repair_mot",
    "turnover_bodywork",
    "turnover_valeting",
    "turnover_other_including_modification",
    "work_on_bikes",
    "work_on_bikes_percentage",
    "work_on_commercial_vehicles",
    "work_on_commercial_vehicles_percentage",
    "work_on_classic_cars",
    "work_on_classic_cars_percentage",
    "classics_vintage_commercial_high_value_details",
  ],
  employee_details: [
    "number_of_employees",
    "number_of_manual_employees",
    "number_of_clerical_employees",
    "annual_wage_roll",
    "clerical_wage_roll",
    "manual_wage_roll",
    "director_wage_roll",
  ],
  road_risks: [
    "no_claims_bonus",
    "loan_and_hire_required",
    "accompanied_demonstration",
    "unaccompanied_demonstration",
    "number_of_trade_plates",
    "trade_plate_details",
    "recovery_work",
    "recovery_work_percentage",
    "windscreen_cover",
  ],
  existing_cover_and_notes: [
    "existing_insurer",
    "target_or_last_years_renewal_premium",
    "additional_notes_or_special_terms",
  ],
  declarations: [
    "fire_extinguishers_serviced",
    "electrical_system_checked_and_iee_certificate",
    "portable_appliance_test_conducted",
    "building_construction_less_than_20_percent_combustible",
    "no_ground_floor_unprotected_accessible_windows",
    "forecourt_or_garage_protections_ram_bars_hoops_fencing",
    "cctv_or_security_lighting_monitored_or_recorded",
    "key_cabinet_or_safe_fixed",
    "experience_in_trade_or_qualifications",
    "no_portable_diesel_or_kerosene_heaters",
    "separate_customer_parking",
    "policy_excess_passed_back_to_company",
    "driving_licences_checked_each_year",
    "vehicles_parked_securely_overnight",
    "health_and_safety_policy",
    "accident_book",
    "up_to_date_risk_assessment",
    "personal_protective_clothing_provided",
    "combustible_waste_kept_in_steel_containers",
    "waste_collected_by_licensed_contractors",
    "engineering_inspection_required",
    "mlp_cyber_loss_recovery_required",
    "other_material_facts",
    "convictions",
    "insurances_cancelled",
    "bankruptcy",
  ],
} as const;

const ROW_SECTIONS = {
  driver_details: [
    "driver_name",
    "driver_occupation",
    "driver_date_of_birth",
    "driver_accidents_convictions",
    "driver_vehicle_usage",
  ],
  vehicle_details: [
    "vehicle_make_and_model",
    "vehicle_year",
    "vehicle_value",
    "vehicle_registration",
    "vehicle_use",
    "vehicle_owner",
  ],
  claims_history: ["claim_date", "claim_details", "claim_amount", "claim_settled"],
} as const;

// The shape we ask Claude to return: a value + confidence per field. We build
// the richer ExtractionField wrapper (requires_review flags etc.) in code.
const leafSchema = z
  .object({
    value: z.string(),
    confidence: z.number(),
  })
  .strict();

function scalarSectionSchema(keys: readonly string[]) {
  return z
    .object(Object.fromEntries(keys.map((key) => [key, leafSchema])))
    .strict();
}

function rowSectionSchema(keys: readonly string[]) {
  return z.array(
    z.object(Object.fromEntries(keys.map((key) => [key, leafSchema]))).strict(),
  );
}

const responseSchema = z
  .object({
    company_details: scalarSectionSchema(SCALAR_SECTIONS.company_details),
    premises_details: scalarSectionSchema(SCALAR_SECTIONS.premises_details),
    business_activities: scalarSectionSchema(SCALAR_SECTIONS.business_activities),
    sums_insured_and_covers: scalarSectionSchema(
      SCALAR_SECTIONS.sums_insured_and_covers,
    ),
    turnover_split: scalarSectionSchema(SCALAR_SECTIONS.turnover_split),
    employee_details: scalarSectionSchema(SCALAR_SECTIONS.employee_details),
    road_risks: scalarSectionSchema(SCALAR_SECTIONS.road_risks),
    existing_cover_and_notes: scalarSectionSchema(
      SCALAR_SECTIONS.existing_cover_and_notes,
    ),
    declarations: scalarSectionSchema(SCALAR_SECTIONS.declarations),
    driver_details: rowSectionSchema(ROW_SECTIONS.driver_details),
    vehicle_details: rowSectionSchema(ROW_SECTIONS.vehicle_details),
    claims_history: rowSectionSchema(ROW_SECTIONS.claims_history),
    // Handwriting written outside any box that could NOT be confidently placed
    // into a field above.
    unmapped_notes: z.array(z.string()),
    // Broker instructions to self (e.g. "doesn't need to be on if too expensive").
    broker_notes: z.array(z.string()),
    // Any other stray handwriting worth preserving verbatim.
    handwritten_notes: z.array(z.string()),
  })
  .strict();

type ExtractionResponse = z.infer<typeof responseSchema>;
type Leaf = z.infer<typeof leafSchema>;

// The exact JSON shape we ask Claude to return, built from the same section
// lists. Embedding this in the prompt (rather than using strict structured
// outputs) avoids the constrained-decoding grammar-size limit that a ~100-field
// strict schema hits, while still pinning the model to the exact keys.
const RESPONSE_TEMPLATE: Record<string, unknown> = {};
for (const [name, keys] of Object.entries(SCALAR_SECTIONS)) {
  RESPONSE_TEMPLATE[name] = Object.fromEntries(
    keys.map((key) => [key, { value: "", confidence: 0 }]),
  );
}
for (const [name, keys] of Object.entries(ROW_SECTIONS)) {
  RESPONSE_TEMPLATE[name] = [
    Object.fromEntries(keys.map((key) => [key, { value: "", confidence: 0 }])),
  ];
}
RESPONSE_TEMPLATE.unmapped_notes = [];
RESPONSE_TEMPLATE.broker_notes = [];
RESPONSE_TEMPLATE.handwritten_notes = [];

const RESPONSE_TEMPLATE_JSON = JSON.stringify(RESPONSE_TEMPLATE);

const SYSTEM_PROMPT = `You are a data-extraction assistant for a UK motor-trade insurance broker. You read photographed or scanned "Premier Insurance Centre — Combined Motor Trade Presentation" fact-find forms. The broker fills these in by hand while taking a client's answers, so the handwriting is theirs.

Your job is to transcribe what is written on the form into the requested structured fields as faithfully as possible.

Rules:
- Transcribe values exactly as written (keep "10k", "£5,000,000", "8.30-5.30", "19 years ago" as-is; do not normalise or convert).
- For tick-box / checkbox items, use "yes" for a tick/check and "no" for a cross (X), plus any adjacent note (e.g. a ticked Intruder Alarm annotated "bells only" -> value "yes - bells only").
- If a field is blank on the form, return an empty string "" with confidence 0. Never invent a value.
- confidence is 0..1 reflecting how sure you are of the transcription for that field (legibility + certainty). Low for hard-to-read handwriting.
- The broker often writes answers OUTSIDE the printed boxes (in margins, at the bottom, squeezed between rows). Treat ALL handwriting on the page as data. First try to place stray handwriting into the field it logically belongs to (e.g. an extra "REG - VALUE" pair written at the bottom is another vehicle row; add it to vehicle_details). Only if you cannot confidently place a note should it go into unmapped_notes (verbatim).
- Broker instructions to themselves (e.g. "doesn't need to be on if too expensive") are not field data — put them in broker_notes verbatim.
- driver_details, vehicle_details and claims_history are variable-length: return one object per row that has any content; omit empty rows.
- Inline annotations next to a field (e.g. "keys taken home" beside the key-cabinet declaration) belong in that field's value.`;

const USER_PROMPT = `Extract every field from this fact-find. The pages provided together make up one client's fact-find (company details, premises, business activities, sums insured, employees, drivers, vehicles, claims, declarations). Read all pages before filling fields. Remember to capture handwriting written outside the printed boxes.

Return ONLY a single JSON object — no prose, no explanation, no markdown code fences — matching EXACTLY this shape and these keys. For every field set "value" (a string; "" if blank on the form) and "confidence" (a number 0-1). For driver_details, vehicle_details and claims_history, include one object per row present on the form using the shown keys, or an empty array [] if there are none. Keep all other keys even when the value is "".

${RESPONSE_TEMPLATE_JSON}`;

function clampConfidence(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toField(leaf: Leaf | undefined): ExtractionField {
  const value = (leaf?.value ?? "").trim();
  const confidence = clampConfidence(leaf?.confidence ?? 0);

  return {
    value,
    confidence,
    source_reference: "",
    // Only flag filled-in values we're unsure about; blank fields stay neutral
    // so the reviewer isn't drowned in false "missing" flags.
    requires_review: value !== "" && confidence < REVIEW_CONFIDENCE_THRESHOLD,
    is_missing_required: false,
  };
}

function mapScalarSection(
  keys: readonly string[],
  section: Record<string, Leaf> | undefined,
): Record<string, ExtractionField> {
  return Object.fromEntries(keys.map((key) => [key, toField(section?.[key])]));
}

function mapRowSection(
  keys: readonly string[],
  rows: Array<Record<string, Leaf>> | undefined,
): Array<Record<string, ExtractionField>> {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    Object.fromEntries(keys.map((key) => [key, toField(row?.[key])])),
  );
}

function noteField(notes: string[] | undefined): ExtractionField {
  const value = (Array.isArray(notes) ? notes : [])
    .map((note) => String(note).trim())
    .filter(Boolean)
    .join("; ");

  return {
    value,
    confidence: value === "" ? 0 : 1,
    source_reference: "",
    // Stray/unmapped handwriting is exactly what the broker should eyeball.
    requires_review: value !== "",
    is_missing_required: false,
  };
}

function mapResponseToExtraction(
  response: ExtractionResponse,
): FactFindExtraction {
  const mapped = {
    company_details: mapScalarSection(
      SCALAR_SECTIONS.company_details,
      response.company_details,
    ),
    premises_details: mapScalarSection(
      SCALAR_SECTIONS.premises_details,
      response.premises_details,
    ),
    business_activities: mapScalarSection(
      SCALAR_SECTIONS.business_activities,
      response.business_activities,
    ),
    sums_insured_and_covers: mapScalarSection(
      SCALAR_SECTIONS.sums_insured_and_covers,
      response.sums_insured_and_covers,
    ),
    turnover_split: mapScalarSection(
      SCALAR_SECTIONS.turnover_split,
      response.turnover_split,
    ),
    employee_details: mapScalarSection(
      SCALAR_SECTIONS.employee_details,
      response.employee_details,
    ),
    road_risks: mapScalarSection(SCALAR_SECTIONS.road_risks, response.road_risks),
    driver_details: mapRowSection(
      ROW_SECTIONS.driver_details,
      response.driver_details,
    ),
    vehicle_details: mapRowSection(
      ROW_SECTIONS.vehicle_details,
      response.vehicle_details,
    ),
    existing_cover_and_notes: mapScalarSection(
      SCALAR_SECTIONS.existing_cover_and_notes,
      response.existing_cover_and_notes,
    ),
    claims_history: mapRowSection(
      ROW_SECTIONS.claims_history,
      response.claims_history,
    ),
    declarations: mapScalarSection(
      SCALAR_SECTIONS.declarations,
      response.declarations,
    ),
    additional_notes: {
      handwritten_notes: noteField(response.handwritten_notes),
      additional_broker_notes: noteField(response.broker_notes),
      unmapped_fact_find_notes: noteField(response.unmapped_notes),
    },
  };

  // Guard: if our key lists ever drift from the schema, this throws clearly
  // instead of persisting a malformed extraction.
  return factFindExtractionSchema.parse(mapped);
}

function toContentBlock(file: ExtractionSourceFile) {
  if (file.media_type === "application/pdf") {
    return {
      type: "document" as const,
      source: {
        type: "base64" as const,
        media_type: "application/pdf" as const,
        data: file.data_base64,
      },
    };
  }

  return {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: file.media_type as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      data: file.data_base64,
    },
  };
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("The AI provider did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export const anthropicFactFindProvider: ExtractionProvider = {
  async extract(files: ExtractionSourceFile[]): Promise<FactFindExtraction> {
    if (files.length === 0) {
      throw new Error("No fact-find pages were provided for extraction.");
    }

    const client = new Anthropic({ apiKey: env.AI_PROVIDER_API_KEY });

    const response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      // Reading a fixed form is not a deep-reasoning task; low effort keeps the
      // call fast enough to finish inside the serverless function time limit.
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            ...files.map(toContentBlock),
            { type: "text" as const, text: USER_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The extraction request was declined by the AI provider.");
    }

    const textBlock = response.content.find((block) => block.type === "text");

    if (!textBlock || textBlock.type !== "text") {
      throw new Error("The AI provider did not return a text response.");
    }

    // JSON is parsed and mapped defensively; the final
    // factFindExtractionSchema.parse in mapResponseToExtraction is the guard.
    const parsed = parseJsonObject(textBlock.text) as ExtractionResponse;

    return mapResponseToExtraction(parsed);
  },
};
