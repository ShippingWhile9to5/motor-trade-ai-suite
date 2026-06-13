import { z } from "zod";

export const submissionComposerBusinessTypeSchema = z.enum([
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
    trade_experience: z.string(),
    no_claims_bonus: z.string(),
    primary_operations: z.string(),
    location: z.string(),
    walls: z.string(),
    roof: z.string(),
    floors: z.string(),
    heating: z.string(),
    business_hours_mon_to_fri: z.string(),
    business_hours_sat_to_sun: z.string(),
    average_vehicle_value: z.string(),
    maximum_vehicle_value: z.string(),
    underwriter_name: z.string(),
    target_premium: z.string(),
    cover_requirements: z.string(),
    security_details: z.string(),
    vehicle_storage: z.string(),
    safety_notes: z.string(),
    customer_facilities: z.string(),
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
