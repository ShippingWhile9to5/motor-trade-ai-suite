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

function createFields<const T extends readonly string[]>(keys: T) {
  return Object.fromEntries(keys.map((key) => [key, missingField()])) as Record<
    T[number],
    ExtractionField
  >;
}

export function createPlaceholderFactFindExtraction(): FactFindExtraction {
  return factFindExtractionSchema.parse({
    company_details: createFields([
      "proposer",
      "company_name",
      "address",
      "postcode",
      "phone",
      "email",
      "renewal_date",
      "date_business_was_established",
      "business_description",
    ] as const),
    premises_details: createFields([
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
    ] as const),
    business_activities: createFields([
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
    ] as const),
    sums_insured_and_covers: createFields([
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
      "public_liability_limit",
      "sales_indemnity_limit",
      "employers_liability_required",
      "employers_liability_limit",
      "floating_cover_required",
      "additional_location_address",
    ] as const),
    turnover_split: createFields([
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
    ] as const),
    employee_details: createFields([
      "number_of_employees",
      "number_of_manual_employees",
      "number_of_clerical_employees",
      "annual_wage_roll",
      "clerical_wage_roll",
      "manual_wage_roll",
      "director_wage_roll",
    ] as const),
    road_risks: createFields([
      "no_claims_bonus",
      "loan_and_hire_required",
      "accompanied_demonstration",
      "unaccompanied_demonstration",
      "number_of_trade_plates",
      "trade_plate_details",
      "recovery_work",
      "recovery_work_percentage",
      "windscreen_cover",
    ] as const),
    driver_details: [],
    vehicle_details: [],
    existing_cover_and_notes: createFields([
      "existing_insurer",
      "target_or_last_years_renewal_premium",
      "additional_notes_or_special_terms",
    ] as const),
    claims_history: [],
    declarations: createFields([
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
    ] as const),
    additional_notes: createFields([
      "handwritten_notes",
      "additional_broker_notes",
      "unmapped_fact_find_notes",
    ] as const),
  });
}

export const factFindProvider: ExtractionProvider = {
  async extract() {
    return createPlaceholderFactFindExtraction();
  },
};
