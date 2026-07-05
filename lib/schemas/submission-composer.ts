import { z } from "zod";

export const submissionComposerBusinessTypeSchema = z.enum([
  "servicing_and_repair",
  "mot_servicing",
  "bodyshop",
  "car_sales",
  "combined",
]);

export const submissionComposerStockProfileSchema = z.enum([
  "standard",
  "mid_range",
  "prestige",
]);

export const submissionComposerInputSchema = z
  .object({
    business_type: submissionComposerBusinessTypeSchema,
    stock_profile: submissionComposerStockProfileSchema,
    business_name: z.string(),
    director_name: z.string(),
    established_year: z.string(),
    incorporated_year: z.string(),
    trade_experience: z.string(),
    prestige_experience: z.string(),
    no_claims_bonus: z.string(),
    primary_operations: z.string(),
    private_cars_percent: z.string(),
    light_commercial_vehicles_percent: z.string(),
    classics_percent: z.string(),
    bikes_percent: z.string(),
    location: z.string(),
    construction_year: z.string(),
    tenure: z.string(),
    walls: z.string(),
    roof: z.string(),
    floors: z.string(),
    heating: z.string(),
    police_distance: z.string(),
    fire_distance: z.string(),
    business_hours_mon_to_fri: z.string(),
    business_hours_saturday: z.string(),
    business_hours_sunday: z.string(),
    average_vehicle_value: z.string(),
    maximum_vehicle_value: z.string(),
    maximum_used_car_value: z.string(),
    underwriter_name: z.string(),
    target_premium: z.string(),
    cover_requirements: z.string(),
    security_details: z.string(),
    security_company: z.string(),
    housekeeping: z.string(),
    vehicle_storage: z.string(),
    safety_notes: z.string(),
    customer_facilities: z.string(),
    work_mot: z.boolean(),
    work_servicing: z.boolean(),
    work_repairs: z.boolean(),
    work_bodywork: z.boolean(),
    work_welding: z.boolean(),
    security_alarm: z.boolean(),
    security_cctv: z.boolean(),
    security_lighting: z.boolean(),
    security_shutters: z.boolean(),
    security_fencing: z.boolean(),
    security_ram_bars: z.boolean(),
    compliance_iee: z.boolean(),
    compliance_health_safety: z.boolean(),
    compliance_accident_book: z.boolean(),
    compliance_risk_assessment: z.boolean(),
    compliance_licence_checks: z.boolean(),
    compliance_excess_recovery: z.boolean(),
    welding_percentage: z.string(),
    paint_spraying: z.boolean(),
    paint_spraying_percentage: z.string(),
  })
  .strict();

export const submissionComposerOutputsSchema = z
  .object({
    motor_trade_additional_information: z.string(),
    material_damage_additional_information: z.string(),
    underwriter_email: z.string(),
  })
  .strict();

export type SubmissionComposerBusinessType = z.infer<
  typeof submissionComposerBusinessTypeSchema
>;
export type SubmissionComposerStockProfile = z.infer<
  typeof submissionComposerStockProfileSchema
>;
export type SubmissionComposerInput = z.infer<
  typeof submissionComposerInputSchema
>;
export type SubmissionComposerOutputs = z.infer<
  typeof submissionComposerOutputsSchema
>;
