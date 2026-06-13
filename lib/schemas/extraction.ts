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

const companyDetailsSchema = z
  .object({
    proposer: extractionFieldSchema,
    company_name: extractionFieldSchema,
    address: extractionFieldSchema,
    postcode: extractionFieldSchema,
    phone: extractionFieldSchema,
    email: extractionFieldSchema,
    renewal_date: extractionFieldSchema,
    date_business_was_established: extractionFieldSchema,
    business_description: extractionFieldSchema,
  })
  .strict();

const premisesDetailsSchema = z
  .object({
    year_premises_was_built: extractionFieldSchema,
    how_long_at_premises: extractionFieldSchema,
    electrics_checked: extractionFieldSchema,
    electrics_last_checked: extractionFieldSchema,
    walls: extractionFieldSchema,
    roof: extractionFieldSchema,
    floors: extractionFieldSchema,
    portable_heating: extractionFieldSchema,
    fixed_heating: extractionFieldSchema,
    intruder_alarm: extractionFieldSchema,
    alarm_maintained: extractionFieldSchema,
    fire_alarm: extractionFieldSchema,
    additional_security_details_at_premises: extractionFieldSchema,
  })
  .strict();

const businessActivitiesSchema = z
  .object({
    service_and_repair: extractionFieldSchema,
    mot: extractionFieldSchema,
    tyres: extractionFieldSchema,
    vehicle_sales: extractionFieldSchema,
    new_vehicles: extractionFieldSchema,
    used_vehicles: extractionFieldSchema,
    bodywork: extractionFieldSchema,
    spray_booth: extractionFieldSchema,
    lpc_approved: extractionFieldSchema,
    paint_thinner_stored_in_metal_container: extractionFieldSchema,
    welding_percentage: extractionFieldSchema,
    type_of_welding: extractionFieldSchema,
    additional_trade_activities: extractionFieldSchema,
    business_hours_mon_to_fri: extractionFieldSchema,
    business_hours_sat_to_sun: extractionFieldSchema,
  })
  .strict();

const sumsInsuredAndCoversSchema = z
  .object({
    buildings_sum_insured: extractionFieldSchema,
    portable_hand_tools: extractionFieldSchema,
    machinery_and_plant: extractionFieldSchema,
    electronic_business_equipment: extractionFieldSchema,
    goods_in_transit: extractionFieldSchema,
    annual_cash_carryings: extractionFieldSchema,
    any_other_loss_of_money: extractionFieldSchema,
    annual_gross_profit: extractionFieldSchema,
    business_interruption_indemnity_period_months: extractionFieldSchema,
    annual_turnover: extractionFieldSchema,
    stock_sum_insured: extractionFieldSchema,
    own_vehicles_sum_insured: extractionFieldSchema,
    customers_vehicles_sum_insured: extractionFieldSchema,
    all_other_contents: extractionFieldSchema,
    fuel_in_tanks: extractionFieldSchema,
    cash_in_safe: extractionFieldSchema,
    number_of_vehicles_in_custody_or_control: extractionFieldSchema,
    public_liability_limit: extractionFieldSchema,
    sales_indemnity_limit: extractionFieldSchema,
    employers_liability_required: extractionFieldSchema,
    employers_liability_limit: extractionFieldSchema,
    floating_cover_required: extractionFieldSchema,
    additional_location_address: extractionFieldSchema,
  })
  .strict();

const turnoverSplitSchema = z
  .object({
    turnover_vehicle_sales_used: extractionFieldSchema,
    turnover_vehicle_sales_new: extractionFieldSchema,
    turnover_service_repair_mot: extractionFieldSchema,
    turnover_bodywork: extractionFieldSchema,
    turnover_valeting: extractionFieldSchema,
    turnover_other_including_modification: extractionFieldSchema,
    work_on_bikes: extractionFieldSchema,
    work_on_bikes_percentage: extractionFieldSchema,
    work_on_commercial_vehicles: extractionFieldSchema,
    work_on_commercial_vehicles_percentage: extractionFieldSchema,
    work_on_classic_cars: extractionFieldSchema,
    work_on_classic_cars_percentage: extractionFieldSchema,
    classics_vintage_commercial_high_value_details: extractionFieldSchema,
  })
  .strict();

const employeeDetailsSchema = z
  .object({
    number_of_employees: extractionFieldSchema,
    number_of_manual_employees: extractionFieldSchema,
    number_of_clerical_employees: extractionFieldSchema,
    annual_wage_roll: extractionFieldSchema,
    clerical_wage_roll: extractionFieldSchema,
    manual_wage_roll: extractionFieldSchema,
    director_wage_roll: extractionFieldSchema,
  })
  .strict();

const roadRisksSchema = z
  .object({
    no_claims_bonus: extractionFieldSchema,
    loan_and_hire_required: extractionFieldSchema,
    accompanied_demonstration: extractionFieldSchema,
    unaccompanied_demonstration: extractionFieldSchema,
    number_of_trade_plates: extractionFieldSchema,
    trade_plate_details: extractionFieldSchema,
    recovery_work: extractionFieldSchema,
    recovery_work_percentage: extractionFieldSchema,
    windscreen_cover: extractionFieldSchema,
  })
  .strict();

const driverDetailsRowSchema = z
  .object({
    driver_name: extractionFieldSchema,
    driver_occupation: extractionFieldSchema,
    driver_date_of_birth: extractionFieldSchema,
    driver_accidents_convictions: extractionFieldSchema,
    driver_vehicle_usage: extractionFieldSchema,
  })
  .strict();

const vehicleDetailsRowSchema = z
  .object({
    vehicle_make_and_model: extractionFieldSchema,
    vehicle_year: extractionFieldSchema,
    vehicle_value: extractionFieldSchema,
    vehicle_registration: extractionFieldSchema,
    vehicle_use: extractionFieldSchema,
    vehicle_owner: extractionFieldSchema,
  })
  .strict();

const existingCoverAndNotesSchema = z
  .object({
    existing_insurer: extractionFieldSchema,
    target_or_last_years_renewal_premium: extractionFieldSchema,
    additional_notes_or_special_terms: extractionFieldSchema,
  })
  .strict();

const claimHistoryRowSchema = z
  .object({
    claim_date: extractionFieldSchema,
    claim_details: extractionFieldSchema,
    claim_amount: extractionFieldSchema,
    claim_settled: extractionFieldSchema,
  })
  .strict();

const declarationsSchema = z
  .object({
    fire_extinguishers_serviced: extractionFieldSchema,
    electrical_system_checked_and_iee_certificate: extractionFieldSchema,
    portable_appliance_test_conducted: extractionFieldSchema,
    building_construction_less_than_20_percent_combustible: extractionFieldSchema,
    no_ground_floor_unprotected_accessible_windows: extractionFieldSchema,
    forecourt_or_garage_protections_ram_bars_hoops_fencing:
      extractionFieldSchema,
    cctv_or_security_lighting_monitored_or_recorded: extractionFieldSchema,
    key_cabinet_or_safe_fixed: extractionFieldSchema,
    experience_in_trade_or_qualifications: extractionFieldSchema,
    no_portable_diesel_or_kerosene_heaters: extractionFieldSchema,
    separate_customer_parking: extractionFieldSchema,
    policy_excess_passed_back_to_company: extractionFieldSchema,
    driving_licences_checked_each_year: extractionFieldSchema,
    vehicles_parked_securely_overnight: extractionFieldSchema,
    health_and_safety_policy: extractionFieldSchema,
    accident_book: extractionFieldSchema,
    up_to_date_risk_assessment: extractionFieldSchema,
    personal_protective_clothing_provided: extractionFieldSchema,
    combustible_waste_kept_in_steel_containers: extractionFieldSchema,
    waste_collected_by_licensed_contractors: extractionFieldSchema,
    engineering_inspection_required: extractionFieldSchema,
    mlp_cyber_loss_recovery_required: extractionFieldSchema,
    other_material_facts: extractionFieldSchema,
    convictions: extractionFieldSchema,
    insurances_cancelled: extractionFieldSchema,
    bankruptcy: extractionFieldSchema,
  })
  .strict();

const additionalNotesSchema = z
  .object({
    handwritten_notes: extractionFieldSchema,
    additional_broker_notes: extractionFieldSchema,
    unmapped_fact_find_notes: extractionFieldSchema,
  })
  .strict();

export const factFindExtractionSchema = z
  .object({
    company_details: companyDetailsSchema,
    premises_details: premisesDetailsSchema,
    business_activities: businessActivitiesSchema,
    sums_insured_and_covers: sumsInsuredAndCoversSchema,
    turnover_split: turnoverSplitSchema,
    employee_details: employeeDetailsSchema,
    road_risks: roadRisksSchema,
    driver_details: z.array(driverDetailsRowSchema),
    vehicle_details: z.array(vehicleDetailsRowSchema),
    existing_cover_and_notes: existingCoverAndNotesSchema,
    claims_history: z.array(claimHistoryRowSchema),
    declarations: declarationsSchema,
    additional_notes: additionalNotesSchema,
  })
  .strict();

export const extractionStatusSchema = z.enum([
  "queued",
  "processing",
  "review_required",
  "approved",
  "failed",
]);

export const extractionRecordSchema = z
  .object({
    id: z.string().uuid(),
    case_id: z.string().uuid(),
    document_id: z.string().uuid(),
    user_id: z.string().min(1),
    status: extractionStatusSchema,
    raw_result_json: factFindExtractionSchema.nullable(),
    reviewed_result_json: factFindExtractionSchema.nullable(),
    error_message: z.string().nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

export const createExtractionInputSchema = z
  .object({
    case_id: z.string().uuid(),
    document_id: z.string().uuid(),
    user_id: z.string().min(1),
    status: extractionStatusSchema.default("queued"),
    raw_result_json: factFindExtractionSchema.nullish(),
    reviewed_result_json: factFindExtractionSchema.nullish(),
    error_message: z.string().nullable().optional(),
  })
  .strict();

export const getExtractionByCaseIdInputSchema = z
  .object({
    case_id: z.string().uuid(),
    user_id: z.string().min(1),
  })
  .strict();

export const updateExtractionInputSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().min(1),
    status: extractionStatusSchema.optional(),
    raw_result_json: factFindExtractionSchema.nullable().optional(),
    reviewed_result_json: factFindExtractionSchema.nullable().optional(),
    error_message: z.string().nullable().optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.status !== undefined ||
      input.raw_result_json !== undefined ||
      input.reviewed_result_json !== undefined ||
      input.error_message !== undefined,
    {
      message: "At least one extraction field must be provided for update.",
    },
  );

export type ExtractionField = z.infer<typeof extractionFieldSchema>;
export type FactFindExtraction = z.infer<typeof factFindExtractionSchema>;
export type ExtractionStatus = z.infer<typeof extractionStatusSchema>;
export type ExtractionRecord = z.infer<typeof extractionRecordSchema>;
export type CreateExtractionInput = z.infer<typeof createExtractionInputSchema>;
export type GetExtractionByCaseIdInput = z.infer<
  typeof getExtractionByCaseIdInputSchema
>;
export type UpdateExtractionInput = z.infer<typeof updateExtractionInputSchema>;
