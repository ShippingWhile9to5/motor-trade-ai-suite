import assert from "node:assert/strict";
import test from "node:test";

type PolicyLetterModule = typeof import("../../lib/policy-letter");

function loadPolicyLetter(): PolicyLetterModule {
  return require("../../lib/policy-letter") as PolicyLetterModule;
}

function baseInput(
  overrides: Partial<ReturnType<PolicyLetterModule["createBlankPolicyLetterManualInput"]>> = {},
) {
  const { createBlankPolicyLetterManualInput } = loadPolicyLetter();

  return {
    ...createBlankPolicyLetterManualInput(),
    driverBasis: "Any Employee for Business use, Named for SDP" as const,
    quoteDate: "2026-07-13",
    ...overrides,
  };
}

test("quotation is valid for 30 days and reads as an ordinal UK date", () => {
  const { calculateValidityDate } = loadPolicyLetter();

  // 13 July + 30 days rolls into August.
  assert.equal(calculateValidityDate("2026-07-13"), "12th August 2026");
  // Rolls across a year boundary.
  assert.equal(calculateValidityDate("2026-12-15"), "14th January 2027");
  // Leap year: 29 Feb exists in 2028.
  assert.equal(calculateValidityDate("2028-01-30"), "29th February 2028");
});

test("ordinal suffixes follow English rules, including the 11-13 exception", () => {
  const { formatUkLongDate } = loadPolicyLetter();
  const march = (day: number) => formatUkLongDate(new Date(2026, 2, day));

  assert.equal(march(1), "1st March 2026");
  assert.equal(march(2), "2nd March 2026");
  assert.equal(march(3), "3rd March 2026");
  assert.equal(march(4), "4th March 2026");
  assert.equal(march(11), "11th March 2026");
  assert.equal(march(12), "12th March 2026");
  assert.equal(march(13), "13th March 2026");
  assert.equal(march(21), "21st March 2026");
  assert.equal(march(22), "22nd March 2026");
  assert.equal(march(23), "23rd March 2026");
  assert.equal(march(31), "31st March 2026");
});

test("insurer selection applies that insurer's standard benefits", () => {
  const { defaultBenefitsForInsurer } = loadPolicyLetter();

  assert.deepEqual(defaultBenefitsForInsurer("Intact (NIG)"), {
    premierProtectedNcd: true,
    lowClaimsRebate: true,
  });
  assert.deepEqual(defaultBenefitsForInsurer("Covéa Insurance"), {
    premierProtectedNcd: true,
    lowClaimsRebate: false,
  });
  assert.deepEqual(defaultBenefitsForInsurer("Aviva"), {
    premierProtectedNcd: false,
    lowClaimsRebate: false,
  });
  assert.deepEqual(defaultBenefitsForInsurer(""), {
    premierProtectedNcd: false,
    lowClaimsRebate: false,
  });
});

test("benefits sentence lists what is ticked and is omitted when nothing is", () => {
  const { generateOpeningParagraph } = loadPolicyLetter();

  const both = generateOpeningParagraph(
    baseInput({ benefits: { premierProtectedNcd: true, lowClaimsRebate: true } }),
  );
  assert.match(
    both,
    /This policy includes the Premier Protected NCD and Low Claims Rebate\./,
  );

  const one = generateOpeningParagraph(
    baseInput({ benefits: { premierProtectedNcd: true, lowClaimsRebate: false } }),
  );
  assert.match(one, /This policy includes the Premier Protected NCD\./);
  assert.doesNotMatch(one, /Low Claims Rebate/);

  const none = generateOpeningParagraph(
    baseInput({ benefits: { premierProtectedNcd: false, lowClaimsRebate: false } }),
  );
  assert.doesNotMatch(none, /This policy includes/);
});

test("opening paragraph follows the agreed wording", () => {
  const { generateOpeningParagraph } = loadPolicyLetter();

  const paragraph = generateOpeningParagraph(
    baseInput({ benefits: { premierProtectedNcd: true, lowClaimsRebate: true } }),
  );

  assert.equal(
    paragraph,
    "Thank you for getting in touch with us for a quotation for your Motor Trade Combined. " +
      "We are pleased to provide the quotation below which is valid until 12th August 2026 and is based upon the details you have provided. " +
      "This policy includes the Premier Protected NCD and Low Claims Rebate. " +
      "The driver basis for this policy is Any Employee for Business use, Named for SDP.",
  );
});

test("a typed driver basis overrides the dropdown selection", () => {
  const { generateOpeningParagraph } = loadPolicyLetter();

  const paragraph = generateOpeningParagraph(
    baseInput({
      driverBasisOverride: "Any driver for Business and named for SDP use",
    }),
  );

  assert.match(
    paragraph,
    /The driver basis for this policy is Any driver for Business and named for SDP use\./,
  );
  assert.doesNotMatch(paragraph, /Any Employee for Business use/);
});

test("extracted data fills the three copy-out sections", () => {
  const { generatePolicyLetterOutputs } = loadPolicyLetter();

  const outputs = generatePolicyLetterOutputs(
    {
      excesses: [
        "Material Damage - All Other Losses - £500",
        "Road Risks - Windscreen - £150",
      ],
      exclusions: ["L0038 - Work Away Exclusion"],
      endorsementsAndConditions: [
        "M0043 - Intruder Alarm Condition (Premises)",
        "V0003 - Driving Licence Check",
      ],
      driverBasis: "Motor Trade Use: 3, SDP Use: 3",
      businessDescription: "Car Service Repair And Mot",
      coverIncluded: [],
      coverNotIncluded: [],
    },
    baseInput(),
  );

  assert.equal(
    outputs.endorsementsAndConditions,
    "M0043 - Intruder Alarm Condition (Premises)\nV0003 - Driving Licence Check",
  );
  assert.equal(outputs.significantExclusions, "L0038 - Work Away Exclusion");
  assert.equal(
    outputs.excesses,
    "Material Damage - All Other Losses - £500\nRoad Risks - Windscreen - £150",
  );
});

test("sections stay empty when no PDF has been extracted", () => {
  const { generatePolicyLetterOutputs } = loadPolicyLetter();

  const outputs = generatePolicyLetterOutputs(null, baseInput());

  assert.equal(outputs.endorsementsAndConditions, "");
  assert.equal(outputs.significantExclusions, "");
  assert.equal(outputs.excesses, "");
  assert.match(outputs.openingParagraph, /Thank you for getting in touch/);
});
