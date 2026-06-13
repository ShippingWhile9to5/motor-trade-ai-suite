import type {
  ExtractionField,
  FactFindExtraction,
} from "./schemas/extraction";
import {
  type SubmissionComposerBusinessType,
  type SubmissionComposerInput,
  type SubmissionComposerOutputs,
  type SubmissionComposerStockProfile,
  submissionComposerInputSchema,
  submissionComposerOutputsSchema,
} from "./schemas/submission-composer";

function fieldToText(field: ExtractionField | undefined) {
  if (!field) {
    return "";
  }

  if (Array.isArray(field.value)) {
    return field.value.join(", ").trim();
  }

  return String(field.value).trim();
}

function normalise(value: string) {
  return value.trim().toLowerCase();
}

function hasMeaningfulValue(value: string) {
  return normalise(value) !== "";
}

function isAffirmative(value: string) {
  const candidate = normalise(value);

  return [
    "yes",
    "y",
    "true",
    "tick",
    "ticked",
    "checked",
    "present",
    "recorded",
    "monitored",
    "fixed",
    "inside",
    "available",
    "provided",
  ].some((token) => candidate === token || candidate.includes(token));
}

function joinNonEmpty(values: string[], separator = " ") {
  return values.map((value) => value.trim()).filter(Boolean).join(separator);
}

function toSentence(value: string, fallback: string) {
  return hasMeaningfulValue(value) ? value.trim() : fallback;
}

function buildPrimaryOperations(extraction: FactFindExtraction) {
  const extractedDescription = fieldToText(
    extraction.company_details.business_description,
  );

  if (hasMeaningfulValue(extractedDescription)) {
    return extractedDescription;
  }

  const activities: string[] = [];
  const definitions = [
    ["service_and_repair", "service and repair"],
    ["mot", "MOT"],
    ["tyres", "tyres"],
    ["vehicle_sales", "vehicle sales"],
    ["bodywork", "bodywork"],
  ] as const;

  definitions.forEach(([key, label]) => {
    if (
      isAffirmative(
        fieldToText(extraction.business_activities[key as keyof typeof extraction.business_activities]),
      )
    ) {
      activities.push(label);
    }
  });

  return activities.join(", ");
}

function buildHeating(extraction: FactFindExtraction) {
  const parts = [
    fieldToText(extraction.premises_details.fixed_heating),
    fieldToText(extraction.premises_details.portable_heating),
  ].filter(hasMeaningfulValue);

  return parts.join(" / ");
}

function inferBusinessType(
  extraction: FactFindExtraction,
): SubmissionComposerBusinessType {
  const hasSales = isAffirmative(
    fieldToText(extraction.business_activities.vehicle_sales),
  );
  const hasService = isAffirmative(
    fieldToText(extraction.business_activities.service_and_repair),
  );
  const hasBodywork = isAffirmative(
    fieldToText(extraction.business_activities.bodywork),
  );

  if (hasSales && (hasService || hasBodywork)) {
    return "combined";
  }

  if (hasBodywork && !hasSales) {
    return "bodyshop";
  }

  if (hasSales) {
    return "car_sales";
  }

  return "mot_servicing";
}

function inferStockProfile(
  extraction: FactFindExtraction,
): SubmissionComposerStockProfile {
  const details = normalise(
    fieldToText(
      extraction.turnover_split.classics_vintage_commercial_high_value_details,
    ),
  );

  if (
    details.includes("prestige") ||
    details.includes("high value") ||
    details.includes("sports")
  ) {
    return "prestige";
  }

  if (details.includes("mid") || details.includes("premium")) {
    return "mid_range";
  }

  return "standard";
}

function getWeldingDescription(percent: string) {
  if (!hasMeaningfulValue(percent)) {
    return "No work involves welding activities.";
  }

  return `Welding activities account for approximately ${percent} of the work.`;
}

function getPaintSprayDescription(
  hasPaintSpraying: boolean,
  percent: string,
) {
  if (!hasPaintSpraying) {
    return "No paint spraying is carried out.";
  }

  if (!hasMeaningfulValue(percent)) {
    return "Paint spraying forms part of the business activities.";
  }

  return `Paint spraying accounts for approximately ${percent} of the work.`;
}

function getBusinessEthos(input: SubmissionComposerInput) {
  switch (input.business_type) {
    case "car_sales":
      return input.stock_profile === "prestige"
        ? `${input.business_name} has built its reputation on presenting well-prepared prestige stock and straightforward customer service, with a focus on quality presentation and controlled vehicle selection.`
        : `${input.business_name} has built its reputation on presenting well-prepared stock and straightforward customer service, with a focus on clean presentation and sensible vehicle selection.`;
    case "bodyshop":
      return `${input.business_name} has built its reputation on careful body repair work, tidy housekeeping, and consistent attention to finish and safety standards.`;
    case "combined":
      return `${input.business_name} has built its reputation on combining vehicle sales with workshop support, giving customers a joined-up service backed by practical motor trade experience.`;
    case "mot_servicing":
    default:
      return `${input.business_name} has built its reputation on dependable servicing, repair work, and customer retention through consistent workshop standards.`;
  }
}

function getExperienceDescription(input: SubmissionComposerInput) {
  const name = input.director_name || "The proposer";
  const experience = input.trade_experience || "long-standing";

  switch (input.business_type) {
    case "car_sales":
      return input.stock_profile === "prestige"
        ? `${name} brings ${experience} of motor trade experience, with a current focus on prestige vehicle sales and customer handling.`
        : `${name} brings ${experience} of motor trade experience, with a current focus on vehicle sales and customer handling.`;
    case "bodyshop":
      return `${name} brings ${experience} of motor trade experience, with a focus on repair quality, workshop controls, and bodyshop operations.`;
    case "combined":
      return `${name} brings ${experience} of motor trade experience across both vehicle sales and workshop activity.`;
    case "mot_servicing":
    default:
      return `${name} brings ${experience} of motor trade experience focused on servicing, repairs, and day-to-day workshop management.`;
  }
}

export function deriveSubmissionComposerInput(
  extraction: FactFindExtraction,
): SubmissionComposerInput {
  return submissionComposerInputSchema.parse({
    business_type: inferBusinessType(extraction),
    stock_profile: inferStockProfile(extraction),
    business_name: fieldToText(extraction.company_details.company_name),
    director_name: fieldToText(extraction.company_details.proposer),
    established_year: fieldToText(
      extraction.company_details.date_business_was_established,
    ),
    trade_experience: fieldToText(
      extraction.declarations.experience_in_trade_or_qualifications,
    ),
    no_claims_bonus: fieldToText(extraction.road_risks.no_claims_bonus),
    primary_operations: buildPrimaryOperations(extraction),
    location: fieldToText(extraction.company_details.address),
    walls: fieldToText(extraction.premises_details.walls),
    roof: fieldToText(extraction.premises_details.roof),
    floors: fieldToText(extraction.premises_details.floors),
    heating: buildHeating(extraction),
    business_hours_mon_to_fri: fieldToText(
      extraction.business_activities.business_hours_mon_to_fri,
    ),
    business_hours_sat_to_sun: fieldToText(
      extraction.business_activities.business_hours_sat_to_sun,
    ),
    average_vehicle_value: "",
    maximum_vehicle_value: "",
    underwriter_name: "",
    target_premium: fieldToText(
      extraction.existing_cover_and_notes.target_or_last_years_renewal_premium,
    ),
    cover_requirements: "",
    security_details: joinNonEmpty(
      [
        fieldToText(extraction.premises_details.additional_security_details_at_premises),
        fieldToText(extraction.additional_notes.handwritten_notes),
      ],
      "\n",
    ),
    vehicle_storage: fieldToText(
      extraction.declarations.vehicles_parked_securely_overnight,
    ),
    safety_notes: joinNonEmpty(
      [
        fieldToText(extraction.additional_notes.additional_broker_notes),
        fieldToText(
          extraction.existing_cover_and_notes.additional_notes_or_special_terms,
        ),
      ],
      "\n",
    ),
    customer_facilities: isAffirmative(
      fieldToText(extraction.declarations.separate_customer_parking),
    )
      ? "Separate customer parking available."
      : "",
    security_alarm: isAffirmative(
      fieldToText(extraction.premises_details.intruder_alarm),
    ),
    security_cctv: isAffirmative(
      fieldToText(
        extraction.declarations.cctv_or_security_lighting_monitored_or_recorded,
      ),
    ),
    security_lighting: isAffirmative(
      fieldToText(
        extraction.declarations.cctv_or_security_lighting_monitored_or_recorded,
      ),
    ),
    security_shutters: isAffirmative(
      fieldToText(
        extraction.declarations.no_ground_floor_unprotected_accessible_windows,
      ),
    ),
    security_fencing: isAffirmative(
      fieldToText(
        extraction.declarations.forecourt_or_garage_protections_ram_bars_hoops_fencing,
      ),
    ),
    security_ram_bars: isAffirmative(
      fieldToText(
        extraction.declarations.forecourt_or_garage_protections_ram_bars_hoops_fencing,
      ),
    ),
    compliance_iee: isAffirmative(
      fieldToText(
        extraction.declarations.electrical_system_checked_and_iee_certificate,
      ),
    ),
    compliance_health_safety: isAffirmative(
      fieldToText(extraction.declarations.health_and_safety_policy),
    ),
    compliance_accident_book: isAffirmative(
      fieldToText(extraction.declarations.accident_book),
    ),
    compliance_risk_assessment: isAffirmative(
      fieldToText(extraction.declarations.up_to_date_risk_assessment),
    ),
    compliance_licence_checks: isAffirmative(
      fieldToText(extraction.declarations.driving_licences_checked_each_year),
    ),
    compliance_excess_recovery: isAffirmative(
      fieldToText(extraction.declarations.policy_excess_passed_back_to_company),
    ),
    welding_percentage: fieldToText(
      extraction.business_activities.welding_percentage,
    ),
    paint_spraying: isAffirmative(
      fieldToText(extraction.business_activities.spray_booth),
    ),
    paint_spraying_percentage: "",
  });
}

export function generateSubmissionComposerOutputs(
  input: SubmissionComposerInput,
): SubmissionComposerOutputs {
  const data = submissionComposerInputSchema.parse(input);
  const businessName = data.business_name || "The business";
  const experienceDescription = getExperienceDescription(data);
  const businessEthos = getBusinessEthos(data);
  const weekdayHours = toSentence(
    data.business_hours_mon_to_fri,
    "Business hours not yet confirmed.",
  );
  const weekendHours = toSentence(
    data.business_hours_sat_to_sun,
    "Weekend hours not yet confirmed.",
  );
  const averageVehicleValue = hasMeaningfulValue(data.average_vehicle_value)
    ? `Average vehicle value: £${data.average_vehicle_value}`
    : "Average vehicle value not yet confirmed.";
  const maximumVehicleValue = hasMeaningfulValue(data.maximum_vehicle_value)
    ? `Maximum value any one vehicle: £${data.maximum_vehicle_value}`
    : "Maximum value any one vehicle not yet confirmed.";

  const securityLines = [
    data.security_alarm ? "Regularly maintained intruder alarm system." : "",
    data.security_cctv ? "CCTV coverage is in place." : "",
    data.security_lighting ? "Security lighting is installed." : "",
    data.security_shutters
      ? "Accessible ground floor openings are protected."
      : "",
    data.security_fencing
      ? "Forecourt or perimeter protection is in place."
      : "",
    data.security_ram_bars ? "Ram bars or hoop protection is in use." : "",
    data.security_details.trim(),
  ].filter(hasMeaningfulValue);

  const complianceLines = [
    data.compliance_iee ? "Current IEE electrical certification held." : "",
    data.compliance_health_safety
      ? "Health and Safety policy is in place."
      : "",
    data.compliance_accident_book ? "Accident book maintained." : "",
    data.compliance_risk_assessment
      ? "Risk assessment kept up to date."
      : "",
    data.compliance_licence_checks
      ? "Driver licence checks carried out annually."
      : "",
    data.compliance_excess_recovery
      ? "Excess recovery process applied where appropriate."
      : "",
    getWeldingDescription(data.welding_percentage),
    getPaintSprayDescription(
      data.paint_spraying,
      data.paint_spraying_percentage,
    ),
    data.safety_notes.trim(),
  ].filter(hasMeaningfulValue);

  const motorTradeText = [
    "Trading Experience:",
    experienceDescription,
    "",
    "Claims History:",
    hasMeaningfulValue(data.no_claims_bonus)
      ? `The proposer currently has ${data.no_claims_bonus} no claims bonus.`
      : "No claims bonus information has not yet been confirmed.",
    "",
    "Business Ethos:",
    businessEthos,
    "",
    "Business Activity:",
    joinNonEmpty(
      [
        hasMeaningfulValue(data.primary_operations)
          ? `Primary operations: ${data.primary_operations}.`
          : "Primary operations still to be confirmed.",
        averageVehicleValue,
        maximumVehicleValue,
      ],
      "\n",
    ),
    "",
    "Premises and Security:",
    joinNonEmpty(
      [
        hasMeaningfulValue(data.location)
          ? `The business trades from ${data.location}.`
          : "Trading address still to be confirmed.",
        ...securityLines,
      ],
      "\n",
    ),
    "",
    "Operating Hours:",
    `Monday to Friday: ${weekdayHours}`,
    `Saturday / Sunday: ${weekendHours}`,
  ].join("\n");

  const materialDamageText = [
    "Building Construction and Occupancy:",
    joinNonEmpty(
      [
        hasMeaningfulValue(data.established_year)
          ? `Business established: ${data.established_year}.`
          : "",
        hasMeaningfulValue(data.location)
          ? `Premises location: ${data.location}.`
          : "",
        hasMeaningfulValue(data.walls) ? `Walls: ${data.walls}.` : "",
        hasMeaningfulValue(data.roof) ? `Roof: ${data.roof}.` : "",
        hasMeaningfulValue(data.floors) ? `Floors: ${data.floors}.` : "",
      ],
      "\n",
    ) || "Construction details still to be confirmed.",
    "",
    "Security Measures:",
    securityLines.join("\n") || "Security details still to be confirmed.",
    "",
    "Electrical, Heating, and Safety Controls:",
    joinNonEmpty(
      [
        hasMeaningfulValue(data.heating)
          ? `Heating: ${data.heating}.`
          : "Heating details still to be confirmed.",
        ...complianceLines,
        hasMeaningfulValue(data.vehicle_storage)
          ? `Vehicle storage: ${data.vehicle_storage}.`
          : "",
        hasMeaningfulValue(data.customer_facilities)
          ? `Customer facilities: ${data.customer_facilities}.`
          : "",
      ],
      "\n",
    ),
  ].join("\n");

  const coverRequirements = hasMeaningfulValue(data.cover_requirements)
    ? data.cover_requirements
    : "No unusual cover requests flagged at this stage.";
  const businessTypeLabel =
    data.business_type === "mot_servicing"
      ? "service, repair and MOT"
      : data.business_type.replaceAll("_", " ");
  const salesQualifier =
    data.business_type === "car_sales" && data.stock_profile === "prestige"
      ? "prestige "
      : "";

  const email = [
    `Subject: Motor Trade Insurance Quote Request - ${businessName}`,
    "",
    `Hi ${data.underwriter_name || "there"},`,
    "",
    `I would like to present ${businessName} for quotation.`,
    "",
    "Client Overview",
    `- Proposer: ${data.director_name || "Not yet confirmed"}`,
    `- Established: ${data.established_year || "Not yet confirmed"}`,
    `- Experience: ${data.trade_experience || "Not yet confirmed"}`,
    `- No Claims Bonus: ${data.no_claims_bonus || "Not yet confirmed"}`,
    "",
    "Business Activities",
    `- Business type: ${salesQualifier}${businessTypeLabel}`,
    `- Primary operations: ${data.primary_operations || "Not yet confirmed"}`,
    `- ${averageVehicleValue}`,
    `- ${maximumVehicleValue}`,
    "",
    "Premises and Controls",
    `- Location: ${data.location || "Not yet confirmed"}`,
    `- Security: ${securityLines.join(" ") || "Not yet confirmed."}`,
    `- Compliance: ${complianceLines.join(" ") || "Not yet confirmed."}`,
    "",
    "Cover Requirements",
    `- ${coverRequirements}`,
    hasMeaningfulValue(data.target_premium)
      ? `- Target premium: £${data.target_premium}`
      : "",
    "",
    "Please let me know if you need anything else.",
    "",
    "Best regards",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return submissionComposerOutputsSchema.parse({
    motor_trade_additional_information: motorTradeText,
    material_damage_additional_information: materialDamageText,
    underwriter_email: email,
  });
}
