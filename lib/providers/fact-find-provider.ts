import "server-only";

import type { ExtractionProvider } from "./extraction";
import {
  type ExtractionField,
  type FactFindExtraction,
  factFindExtractionSchema,
} from "../schemas/extraction";

function missingField(): ExtractionField {
  return {
    value: "",
    confidence: 0,
    source_reference: "",
    requires_review: true,
    is_missing_required: true,
  };
}

export function createPlaceholderFactFindExtraction(): FactFindExtraction {
  return factFindExtractionSchema.parse({
    business_details: {
      client_name: missingField(),
      trading_name: missingField(),
      business_type: missingField(),
      contact_name: missingField(),
      email: missingField(),
      phone: missingField(),
    },
    premises: {
      address: missingField(),
      occupancy: missingField(),
      construction: missingField(),
      heating: missingField(),
      neighbouring_trades: missingField(),
    },
    security: {
      alarms: missingField(),
      cctv: missingField(),
      locks: missingField(),
      gates: missingField(),
      key_security: missingField(),
    },
    vehicles_and_stock: {
      stock_value: missingField(),
      vehicle_types: missingField(),
      own_vehicles: missingField(),
      demonstration_use: missingField(),
      trade_plates: missingField(),
      overnight_location: missingField(),
    },
    drivers: [],
    claims_history: {
      has_claims: missingField(),
      no_claims_bonus: missingField(),
      claims: [],
    },
    current_insurance: {
      insurer: missingField(),
      policy_number: missingField(),
      renewal_date: missingField(),
      premium: missingField(),
      covers_held: missingField(),
    },
    cover_required: {
      road_risks: missingField(),
      public_liability: missingField(),
      employers_liability: missingField(),
      material_damage: missingField(),
      business_interruption: missingField(),
      requested_start_date: missingField(),
    },
  });
}

export const factFindProvider: ExtractionProvider = {
  async extract() {
    return createPlaceholderFactFindExtraction();
  },
};
