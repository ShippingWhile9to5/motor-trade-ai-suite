import {
  type SubmissionComposerInput,
  type SubmissionComposerOutputs,
  submissionComposerInputSchema,
  submissionComposerOutputsSchema,
} from "./schemas/submission-composer";

function normalise(value: string) {
  return value.trim().toLowerCase();
}

function hasMeaningfulValue(value: string) {
  return normalise(value) !== "";
}

function formatYearPhrase(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /\byear/i.test(trimmed) ? trimmed : `${trimmed} years`;
}

function getWeldingDescription(percent: string) {
  const weldingPercent = Number.parseFloat(percent);

  if (!hasMeaningfulValue(percent) || weldingPercent === 0) {
    return "No work involves welding activities.";
  }

  if (weldingPercent <= 2) {
    return `Minimal welding activities account for approximately ${percent}% of work (PPE provided).`;
  }

  if (weldingPercent <= 10) {
    return `Limited welding operations account for approximately ${percent}% of work, with PPE provided and strict safety protocols in place.`;
  }

  return `Welding operations account for approximately ${percent}% of work, with comprehensive PPE provided and strict safety protocols in place.`;
}

function getPaintSprayDescription(
  hasPaintSpraying: boolean,
  percent: string,
) {
  if (!hasPaintSpraying) {
    return "No paint spraying is carried out.";
  }

  const paintPercent = Number.parseFloat(percent);

  if (!hasMeaningfulValue(percent) || paintPercent === 0) {
    return "No paint spraying is carried out.";
  }

  if (paintPercent <= 5) {
    return `Minimal paint spraying accounts for approximately ${percent}% of work.`;
  }

  if (paintPercent <= 20) {
    return `Paint spraying operations account for approximately ${percent}% of work, conducted in dedicated spray booth.`;
  }

  return `Paint spraying is a core activity, accounting for approximately ${percent}% of work, with dedicated spray booth and ventilation systems.`;
}

function getBusinessEthos(input: SubmissionComposerInput) {
  const businessName = input.business_name || "The business";
  let ethos = `${businessName} has built its reputation on customer service excellence`;

  switch (input.business_type) {
    case "car_sales":
      return input.stock_profile === "prestige"
        ? `${ethos} and a commitment to dealing with five star quality vehicles. The business is well-regarded in the local area and maintains high standards across all aspects of its operation. They benefit from a loyal returning customer base and is well-regarded in the local area for its professionalism and high standards.`
        : `${ethos} and a commitment to presenting quality used vehicles. The business is well-regarded in the local area and maintains high standards across all aspects of its operation. They benefit from a loyal returning customer base and is well-regarded in the local area for its professionalism and high standards.`;
    case "bodyshop":
      return `${ethos} and a commitment to delivering high-quality accident repair and restoration work. The business is well-regarded in the local area for its attention to detail and professional finish. They benefit from strong relationships with insurance companies and repeat customers.`;
    case "combined":
      return `${ethos} and a commitment to delivering five-star standard repairs while also presenting quality vehicles for sale. The business is well-regarded in the local area and maintains high standards across all aspects of its operation.`;
    case "mot_servicing":
    case "servicing_and_repair":
    default:
      return `${ethos} and a commitment to delivering five-star standard repairs and maintenance. The business is well-regarded in the local area and maintains high standards across all aspects of its workshop operations. They benefit from a loyal returning customer base built on trust and reliability.`;
  }
}

function getExperienceDescription(input: SubmissionComposerInput) {
  const name = input.director_name || "The proposer";
  const hasExperience = hasMeaningfulValue(input.trade_experience);
  const experience = hasExperience
    ? formatYearPhrase(input.trade_experience)
    : "many years";
  const primaryOperations = input.primary_operations || "motor trade work";

  switch (input.business_type) {
    case "car_sales":
      if (input.stock_profile === "prestige" && input.prestige_experience) {
        return `${name} brings over ${experience} of experience in the motor trade industry, specialising in car sales. With regards to used prestige vehicle sales, ${name.split(" ")[0]} has over ${formatYearPhrase(input.prestige_experience)} experience.`;
      }
      return `${name} brings over ${experience} of experience in the motor trade industry, specialising in ${primaryOperations.toLowerCase()}.`;
    case "bodyshop":
      return `${name} brings over ${experience} of experience in the motor trade industry, specialising in bodywork, accident repair, and paint spraying operations.`;
    case "combined":
      return `${name} brings over ${experience} of experience in the motor trade industry, specialising in ${primaryOperations.toLowerCase()}.`;
    case "servicing_and_repair":
      return `${name} brings over ${experience} of experience in the motor trade industry, specialising in vehicle servicing and repairs.`;
    case "mot_servicing":
    default:
      return `${name} brings over ${experience} of experience in the motor trade industry, specialising in vehicle servicing, repairs, and MOT testing.`;
  }
}

function getClaimsHistoryText(ncbYears: string) {
  const numericYears = Number.parseInt(ncbYears, 10);

  if (Number.isNaN(numericYears)) {
    return ncbYears
      ? `The client currently holds ${ncbYears} claim-free motor trade insurance.`
      : "The client's no claims bonus position is to be confirmed.";
  }

  if (numericYears >= 10) {
    return `The client holds an exceptional ${formatYearPhrase(ncbYears)} of claim-free motor trade insurance, demonstrating outstanding risk management practices and operational excellence over more than a decade.`;
  }

  if (numericYears >= 5) {
    return `The client currently holds ${formatYearPhrase(ncbYears)} of claim-free motor trade insurance, reflecting strong risk management practices and operational diligence.`;
  }

  return `The client currently holds ${formatYearPhrase(ncbYears)} of claim-free motor trade insurance.`;
}

function buildSecurityMeasures(data: SubmissionComposerInput) {
  const details = data.security_details;
  const detailsLower = normalise(details);
  const lines: string[] = [];

  if (data.security_alarm) {
    if (detailsLower.includes("security company") || data.security_company) {
      lines.push("Regularly maintained intruder alarm system linked to security company.");
    } else if (detailsLower.includes("police")) {
      lines.push("Regularly maintained intruder alarm system which is linked to the police. Directors and 3 members of staff will also be notified.");
    } else {
      lines.push("Regularly maintained intruder alarm system.");
    }
  }

  if (data.security_cctv) {
    if (detailsLower.includes("28-day") || detailsLower.includes("retention")) {
      lines.push("CCTV system covering entire premises with 28-day retention, linked to owner's phone.");
    } else if (detailsLower.includes("staff") || detailsLower.includes("phone")) {
      lines.push("CCTV System linked to 3 member of staff phones so all of them will be notified.");
    } else {
      lines.push("CCTV system installed.");
    }
  } else {
    lines.push("No CCTV system");
  }

  if (data.security_shutters) {
    lines.push("Shutters on ground floor windows");
    lines.push("Metal roller shutter doors securing the main access points");
  }

  if (data.security_ram_bars) {
    lines.push("Ram bars/Bollards for forecourt protection so no cars can get out.");
  }

  if (data.security_fencing) {
    lines.push("Heavy duty steel gate at the back.");
  }

  if (
    data.security_company ||
    detailsLower.includes("drive round") ||
    detailsLower.includes("patrol")
  ) {
    lines.push(`${data.security_company || "Security company"} drive round every night to check the premises.`);
  }

  if (details.trim()) {
    const additionalDetails = details
      .replace(/alarm.*?(linked|to).*?(police|security|company|staff)/gi, "")
      .replace(/cctv.*?(linked|to|phone|retention|28-day)/gi, "")
      .replace(/security company.*?drive.*?round/gi, "")
      .trim();

    if (additionalDetails.length > 10) {
      lines.push(additionalDetails);
    }
  }

  return lines.join("\n");
}

export function generateSubmissionComposerOutputs(
  input: SubmissionComposerInput,
): SubmissionComposerOutputs {
  const data = submissionComposerInputSchema.parse(input);
  const businessName = data.business_name || "The business";
  const experienceDescription = getExperienceDescription(data);
  const businessEthos = getBusinessEthos(data);
  const incorporatedText = data.incorporated_year
    ? `, incorporated in ${data.incorporated_year}`
    : "";
  const claimsHistory = getClaimsHistoryText(data.no_claims_bonus);
  const securityMeasures = buildSecurityMeasures(data);
  const averageVehicleValue = `Average Vehicle Value: £${data.average_vehicle_value}`;
  const maximumVehicleValue = `Maximum Value (any one vehicle): £${data.maximum_vehicle_value}`;
  const constructionYear = data.construction_year || data.established_year;
  const tenure = data.tenure || "Tenure to be confirmed";
  const weekdayHours = data.business_hours_mon_to_fri;
  const saturdayHours = data.business_hours_saturday;
  const sundayHours = data.business_hours_sunday;

  const vehicleTypes = [
    "Vehicle Types:",
    data.private_cars_percent
      ? `Standard private cars: ${data.private_cars_percent}%`
      : "",
    data.light_commercial_vehicles_percent
      ? `Light commercial vehicles (vans): ${data.light_commercial_vehicles_percent}%`
      : "",
    data.classics_percent ? `Classics: ${data.classics_percent}%` : "",
    data.bikes_percent && Number.parseInt(data.bikes_percent, 10) > 0
      ? data.business_type === "car_sales" && data.stock_profile === "prestige"
        ? `Bikes: ${data.bikes_percent}% (${businessName.split(" ")[0]} sell the odd bike)`
        : `Bikes: ${data.bikes_percent}%`
      : "No work on bikes",
    "",
    averageVehicleValue,
    maximumVehicleValue,
  ].filter((line) => line !== "").join("\n");

  const locationDescription =
    data.business_type === "car_sales" && data.stock_profile === "prestige"
      ? `a well-regarded area on ${data.location}`
      : data.location;

  const premisesSecurity = [
    "Premises Security & Housekeeping:",
    `The unit is located in ${locationDescription}, offering natural surveillance and ease of access.`,
    data.police_distance
      ? `Nearest police station: approx. ${data.police_distance} km`
      : "",
    data.fire_distance
      ? `Nearest fire station: approx. ${data.fire_distance} km`
      : "",
    "",
    `Housekeeping standards are ${data.housekeeping.toLowerCase()}, with the premises kept clean, organised, and professionally maintained.`,
  ].filter((line) => line !== "").join("\n");

  const operationalDetails = [
    "Operational Details:",
    "",
    "Opening Hours:",
    `Monday to Friday: ${weekdayHours}`,
    `Saturday: ${saturdayHours}`,
    `Sunday: ${sundayHours}`,
    "",
    "Heating:",
    data.heating,
  ].join("\n");

  const motorTradeText = [
    "Trading Experience:",
    `${experienceDescription} The company was established in ${data.established_year}${incorporatedText}, demonstrating long-term industry involvement, resilience, and growth.`,
    "",
    "Claims History:",
    claimsHistory,
    "",
    "Business Ethos:",
    businessEthos,
    "",
    vehicleTypes,
    "",
    premisesSecurity,
    "",
    "Security Measures:",
    securityMeasures,
    "",
    operationalDetails,
  ].join("\n");

  let buildingConstruction = `Building Construction & Age:\nThe premises were constructed in ${constructionYear}`;
  const constructionNumber = Number.parseInt(constructionYear, 10);

  if (
    constructionYear.toLowerCase().includes("1900") ||
    (constructionNumber > 1800 && constructionNumber < 1950)
  ) {
    buildingConstruction +=
      ", using non-combustible materials, offering a solid structural foundation and reduced fire risk.";
  } else if (constructionNumber >= 2000) {
    buildingConstruction +=
      ", providing modern construction standards and reduced fire risk.";
  } else {
    buildingConstruction += ".";
  }

  let property = "Property:\n";
  if (tenure === "Owner-occupied") {
    property +=
      "Client owns the property, demonstrating long-term commitment to the business.";
  } else if (tenure === "Rented property") {
    property += "Client rents the property.";
  } else {
    property += `Tenure: ${tenure}`;
  }

  const materialSecurity = [
    "Security Measures:",
    securityMeasures,
    data.security_lighting ? "Security lighting installed across the premises." : "",
    data.security_fencing && data.security_ram_bars
      ? "Heavy-duty fencing, and ram bars for forecourt and garage protection."
      : "",
    data.security_fencing && !data.security_ram_bars
      ? "Heavy-duty fencing securing the perimeter."
      : "",
    !data.security_fencing && data.security_ram_bars
      ? "Ram bars/bollards for forecourt protection."
      : "",
  ].filter((line) => line !== "").join("\n");

  const operationalSafety = [
    "Operational Safety & Risk Management:",
    getWeldingDescription(data.welding_percentage),
    getPaintSprayDescription(data.paint_spraying, data.paint_spraying_percentage),
    data.compliance_licence_checks
      ? "Driver licence checks are conducted annually."
      : "",
    data.safety_notes,
    data.compliance_health_safety
      ? "The business has a formal Health & Safety policy, an accident book, and an up-to-date risk assessment in place."
      : "",
    data.compliance_excess_recovery
      ? "The garage operates a policy of recovering insurance excess costs from the driver, promoting accountability."
      : "",
  ].filter((line) => line !== "").join("\n");

  const materialDamageText = [
    buildingConstruction,
    "",
    property,
    "",
    `Walls: ${data.walls}\nRoof: ${data.roof}\nFloor: ${data.floors}\nThis provides a solid structural foundation and reduces fire risk.`,
    "",
    materialSecurity,
    "",
    "Electrical Safety:",
    "The client has had the electrical systems professionally inspected and holds a current IEE certificate, confirming compliance with electrical safety standards.",
    "",
    "Heating:",
    data.heating,
    "",
    "Vehicle Storage:",
    data.vehicle_storage,
    "",
    operationalSafety,
    data.customer_facilities
      ? `\nCustomer Facilities:\n${data.customer_facilities}`
      : "",
  ].join("\n");

  let intro: string;
  if (data.business_type === "car_sales" && data.stock_profile === "prestige") {
    intro = `I'd like to present a well-established motor trade risk for quotation - ${businessName}, a well-known and reputable used prestige car sales business based in one of the nicest parts of ${data.location.includes(",") ? data.location.split(",").slice(-1)[0].trim() : "the area"}. It is based on ${data.location}. Below is a detailed summary of the risk to assist with underwriting.`;
  } else if (
    data.business_type === "mot_servicing" ||
    data.business_type === "servicing_and_repair"
  ) {
    intro = `I'd like to present a well-established motor trade risk for quotation - ${businessName}, a reputable vehicle servicing and repair specialist based in ${data.location}. Below is a detailed summary of the risk to assist with underwriting.`;
  } else if (data.business_type === "bodyshop") {
    intro = `I'd like to present a well-established motor trade risk for quotation - ${businessName}, a professional bodyshop specialising in accident repair based in ${data.location}. Below is a detailed summary of the risk to assist with underwriting.`;
  } else {
    intro = `I'd like to present a well-established motor trade risk for quotation - ${businessName}, a long-standing ${data.primary_operations.toLowerCase()} business based in ${data.location}. Below is a detailed summary of the risk to assist with underwriting.`;
  }

  const establishedText = data.incorporated_year
    ? `Trading since ${data.established_year}, incorporated in ${data.incorporated_year}`
    : `Trading since ${data.established_year}`;

  const emailSecurityLines = [
    data.security_alarm
      ? data.security_company
        ? "   * Regularly maintained intruder alarm system linked to security company."
        : "   * Intruder alarm system linked to police and to directors + 3 staff members"
      : "",
    data.security_cctv ? "   * CCTV system installed" : "",
    data.security_shutters
      ? "   * Shutters on all accessible ground floor windows\n   * Metal roller shutters on main access points"
      : "",
    data.security_ram_bars
      ? "   * Ram bars/Bollards for forecourt protection so no cars can get out."
      : "",
    data.security_fencing ? "   * Heavy duty steel gate at the back." : "",
    data.security_lighting ? "   * Security lighting installed" : "",
    data.security_company
      ? `   * Security company called ${data.security_company} drive round every night to check the premises.`
      : "",
  ].filter((line) => line !== "").join("\n");

  const email = [
    `Subject: Motor Trade Insurance Quote Request - ${businessName}`,
    "",
    `Hi ${data.underwriter_name},`,
    "",
    "Hope you're well.",
    "",
    intro,
    "",
    "Client Overview",
    `* Business Name: ${businessName}`,
    `* Director: ${data.director_name}`,
    `* Established: ${establishedText}`,
    `* Motor Trade Experience: ${formatYearPhrase(data.trade_experience)}${data.business_type === "car_sales" && data.stock_profile === "prestige" && data.prestige_experience ? ` and ${formatYearPhrase(data.prestige_experience)} of those years has been dealing with prestige car sales` : ""}`,
    `* Motor Trade NCB: ${formatYearPhrase(data.no_claims_bonus)}, claim-free`,
    "",
    "Business Activities",
    `* Primary Operations: ${data.primary_operations}`,
    "* Vehicle Types & Breakdown:",
    data.private_cars_percent
      ? `   * Standard Private Cars: ${data.private_cars_percent}%`
      : "",
    data.light_commercial_vehicles_percent
      ? `   * Light Commercial Vehicles: ${data.light_commercial_vehicles_percent}%`
      : "",
    data.classics_percent ? `   * Classic Cars: ${data.classics_percent}%` : "",
    data.bikes_percent && Number.parseInt(data.bikes_percent, 10) > 0
      ? `   * Bikes: ${data.bikes_percent}%`
      : "",
    `* Average Vehicle Value: £${data.average_vehicle_value}`,
    `* Maximum Value Any One Vehicle: £${data.maximum_vehicle_value}`,
    data.maximum_used_car_value
      ? `* Sale of Used Cars: Max value £${data.maximum_used_car_value}`
      : "",
    "",
    "Premises & Construction",
    `* Location: ${data.business_type === "car_sales" && data.stock_profile === "prestige" ? `On ${data.location}` : data.location}`,
    `* Construction Year: ${constructionYear}`,
    `* Materials: Walls: ${data.walls} | Roof: ${data.roof} | Floor: ${data.floors}`,
    `* Heating: ${data.heating}`,
    `* Tenure: ${tenure}`,
    data.police_distance || data.fire_distance
      ? `* Proximity to Emergency Services:\n${data.police_distance ? `   * Police Station: ~${data.police_distance} km\n` : ""}${data.fire_distance ? `   * Fire Station: ~${data.fire_distance} km` : ""}`
      : "",
    "",
    "Security & Risk Management",
    "* Security Measures:",
    emailSecurityLines,
    `* Housekeeping: ${data.housekeeping} - clean, organised, and professionally maintained`,
    `* Vehicle Storage: ${data.vehicle_storage}`,
    "",
    "Safety & Compliance",
    data.compliance_iee ? "* Electrical Safety: Current IEE certificate held" : "",
    "* Operational Safety:",
    data.welding_percentage && Number.parseInt(data.welding_percentage, 10) > 0
      ? `   * Welding accounts for approx. ${data.welding_percentage}% of work (PPE provided)`
      : "   * No welding activities",
    data.paint_spraying_percentage &&
    Number.parseInt(data.paint_spraying_percentage, 10) > 0
      ? `   * Paint spraying accounts for approx. ${data.paint_spraying_percentage}% of work`
      : "   * No paint spraying activities",
    data.compliance_health_safety
      ? "   * Formal Health & Safety policy in place\n   * Accident book maintained\n   * Risk assessment up to date"
      : "",
    data.compliance_licence_checks
      ? "   * Driver licence checks conducted annually"
      : "",
    data.compliance_excess_recovery
      ? "   * Excess recovery policy implemented"
      : "",
    data.safety_notes ? `   * ${data.safety_notes}` : "",
    "",
    "Opening Hours",
    `* Mon-Fri: ${data.business_hours_mon_to_fri}`,
    `* Sat: ${data.business_hours_saturday}`,
    `* Sun: ${data.business_hours_sunday}`,
    "",
    "Cover Requirements",
    data.cover_requirements ? `* ${data.cover_requirements}` : "",
    `* Target Premium: £${data.target_premium}`,
    "",
    "Please let me know if you need any further information.",
    "",
    "Best regards",
  ].join("\n");

  return submissionComposerOutputsSchema.parse({
    motor_trade_additional_information: motorTradeText,
    material_damage_additional_information: materialDamageText,
    underwriter_email: email,
  });
}
