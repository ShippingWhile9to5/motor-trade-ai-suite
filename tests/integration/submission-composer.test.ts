import assert from "node:assert/strict";
import test from "node:test";

test("submission composer keeps wording aligned to selected business type", async () => {
  const { generateSubmissionComposerOutputs } = require(
    "../../lib/submission-composer",
  ) as typeof import("../../lib/submission-composer");
  const { submissionComposerInputSchema } = require(
    "../../lib/schemas/submission-composer",
  ) as typeof import("../../lib/schemas/submission-composer");

  const baseInput = submissionComposerInputSchema.parse({
    business_type: "car_sales",
    stock_profile: "standard",
    business_name: "Nick Motors Ltd",
    director_name: "Nick",
    established_year: "1988",
    incorporated_year: "",
    trade_experience: "18 years",
    prestige_experience: "",
    no_claims_bonus: "6+ years",
    primary_operations: "Used car sales",
    private_cars_percent: "",
    light_commercial_vehicles_percent: "",
    classics_percent: "",
    bikes_percent: "",
    location: "Manchester",
    construction_year: "",
    tenure: "",
    walls: "",
    roof: "",
    floors: "",
    heating: "",
    police_distance: "",
    fire_distance: "",
    business_hours_mon_to_fri: "",
    business_hours_saturday: "",
    business_hours_sunday: "",
    average_vehicle_value: "",
    maximum_vehicle_value: "",
    maximum_used_car_value: "",
    underwriter_name: "",
    target_premium: "",
    cover_requirements: "",
    security_details: "",
    security_company: "",
    housekeeping: "Excellent",
    vehicle_storage: "",
    safety_notes: "",
    customer_facilities: "",
    work_mot: false,
    work_servicing: false,
    work_repairs: false,
    work_bodywork: false,
    work_welding: false,
    security_alarm: false,
    security_cctv: false,
    security_lighting: false,
    security_shutters: false,
    security_fencing: false,
    security_ram_bars: false,
    compliance_iee: false,
    compliance_health_safety: false,
    compliance_accident_book: false,
    compliance_risk_assessment: false,
    compliance_licence_checks: false,
    compliance_excess_recovery: false,
    welding_percentage: "",
    paint_spraying: false,
    paint_spraying_percentage: "",
  });

  const carSalesOutputs = generateSubmissionComposerOutputs(baseInput);

  assert.match(
    carSalesOutputs.motor_trade_additional_information,
    /quality used vehicles/i,
  );

  const servicingOutputs = generateSubmissionComposerOutputs({
    ...baseInput,
    business_type: "mot_servicing",
  });

  assert.match(
    servicingOutputs.motor_trade_additional_information,
    /vehicle servicing, repairs, and MOT testing/i,
  );
  assert.doesNotMatch(
    servicingOutputs.motor_trade_additional_information,
    /quality used vehicles/i,
  );

  const servicingNoMotOutputs = generateSubmissionComposerOutputs({
    ...baseInput,
    business_type: "servicing_and_repair",
  });

  assert.match(
    servicingNoMotOutputs.motor_trade_additional_information,
    /vehicle servicing and repairs/i,
  );
  assert.doesNotMatch(
    servicingNoMotOutputs.motor_trade_additional_information,
    /MOT testing/i,
  );
});
