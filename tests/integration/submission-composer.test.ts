import assert from "node:assert/strict";
import test from "node:test";

test("submission composer keeps wording aligned to selected business type", async () => {
  const { createPlaceholderFactFindExtraction } = require(
    "../../lib/providers/fact-find-provider",
  ) as typeof import("../../lib/providers/fact-find-provider");
  const {
    deriveSubmissionComposerInput,
    generateSubmissionComposerOutputs,
  } = require(
    "../../lib/submission-composer",
  ) as typeof import("../../lib/submission-composer");

  const extraction = createPlaceholderFactFindExtraction();
  extraction.company_details.company_name.value = "Nick Motors Ltd";
  extraction.company_details.proposer.value = "Nick";
  extraction.company_details.business_description.value = "Used car sales";
  extraction.company_details.address.value = "Manchester";
  extraction.company_details.date_business_was_established.value = "1988";
  extraction.declarations.experience_in_trade_or_qualifications.value =
    "18 years";
  extraction.road_risks.no_claims_bonus.value = "6+ years";
  extraction.business_activities.vehicle_sales.value = "yes";

  const derived = deriveSubmissionComposerInput(extraction);
  assert.equal(derived.business_type, "car_sales");

  const carSalesOutputs = generateSubmissionComposerOutputs({
    ...derived,
    business_type: "car_sales",
  });

  assert.match(
    carSalesOutputs.motor_trade_additional_information,
    /quality used vehicles/i,
  );

  const servicingOutputs = generateSubmissionComposerOutputs({
    ...derived,
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
});
