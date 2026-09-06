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

  const none = {
    premierProtectedNcd: false,
    lowClaimsRebate: false,
    protectedNcd: false,
    unaccompaniedDemonstrations: false,
    loanAndHire: false,
    floodExcluded: false,
  };

  assert.deepEqual(defaultBenefitsForInsurer("Intact (NIG)"), {
    ...none,
    premierProtectedNcd: true,
    lowClaimsRebate: true,
  });
  assert.deepEqual(defaultBenefitsForInsurer("Covéa Insurance"), {
    ...none,
    premierProtectedNcd: true,
  });
  assert.deepEqual(defaultBenefitsForInsurer("Aviva"), none);
  assert.deepEqual(defaultBenefitsForInsurer(""), none);
  // An insurer typed into "Other" has no standard benefits on record, so
  // nothing is ticked for the broker rather than something being guessed.
  assert.deepEqual(defaultBenefitsForInsurer("Some Other Insurer Ltd"), none);

  // The lines that describe this risk rather than the insurer's scheme are
  // never defaulted — they are only true if the broker says so.
  for (const insurer of ["Intact (NIG)", "Covéa Insurance", "Aviva"] as const) {
    const defaults = defaultBenefitsForInsurer(insurer);

    assert.equal(defaults.unaccompaniedDemonstrations, false);
    assert.equal(defaults.loanAndHire, false);
    assert.equal(defaults.floodExcluded, false);
  }
});

test("an unlisted insurer changes nothing but the benefit defaults", () => {
  const { generateOpeningParagraph } = loadPolicyLetter();

  // The insurer's only effect on the wording is which benefits get ticked —
  // its name never appears in the paragraph. So a typed-in insurer reads
  // exactly like a listed one with no standard benefits.
  assert.equal(
    generateOpeningParagraph(baseInput({ insurer: "Some Other Insurer Ltd" })),
    generateOpeningParagraph(baseInput({ insurer: "Aviva" })),
  );
});

test("the opening paragraph is the two sentences Acturis writes", () => {
  const { generateOpeningParagraph } = loadPolicyLetter();

  // Checked against four real letters: the driver basis and the included
  // benefits are NOT in this paragraph. They belong under Important
  // Information, and putting them here produced text with nowhere to go.
  const paragraph = generateOpeningParagraph(
    baseInput({
      benefits: {
        ...baseInput().benefits,
        premierProtectedNcd: true,
        loanAndHire: true,
      },
    }),
  );

  assert.equal(
    paragraph,
    "Thank you for getting in touch with us for a quotation for your Motor Trade Combined. " +
      "We are pleased to provide the quotation below which is valid until 12th August 2026 and is based upon the details you have provided.",
  );
  assert.doesNotMatch(paragraph, /driver basis/i);
  assert.doesNotMatch(paragraph, /Loan and Hire/i);
});

test("important information reproduces a real letter's lines", () => {
  const { generateImportantInformation } = loadPolicyLetter();

  // Letter 1, line for line.
  const lines = generateImportantInformation(
    baseInput({
      driverBasis:
        "Any Employee under Contract of Service for Business use, named for SDP use" as never,
      benefits: {
        ...baseInput().benefits,
        unaccompaniedDemonstrations: true,
        loanAndHire: true,
      },
    }),
  );

  assert.deepEqual(lines.split("\n"), [
    "Driver basis is Any Employee under Contract of Service for Business use, named for SDP use",
    "Quotation includes unaccompanied demonstrations",
    "Quotation includes Loan and Hire vehicles",
  ]);
});

test("a single vehicle limit and free-typed lines are carried through", () => {
  const { generateImportantInformation } = loadPolicyLetter();

  // Letter 2, which carries a limit and a line no tick-box would cover.
  const lines = generateImportantInformation(
    baseInput({
      driverBasis: "Open for Business Use, and Named for SDP" as never,
      benefits: { ...baseInput().benefits, protectedNcd: true, floodExcluded: true },
      singleVehicleLimit: "100K",
    }),
  );

  assert.deepEqual(lines.split("\n"), [
    "Driver basis is Open for Business Use, and Named for SDP",
    "Quotation includes protected no claims discount",
    "Quotation excludes flood cover",
    "Single vehicle limit set at £100K for own and customer vehicles",
  ]);

  // A limit typed with its own symbol is not given a second one.
  assert.match(
    generateImportantInformation(baseInput({ singleVehicleLimit: "£75,000" })),
    /set at £75,000 for own/,
  );
});

test("extra lines are kept exactly as typed, blanks dropped", () => {
  const { generateImportantInformation } = loadPolicyLetter();

  const lines = generateImportantInformation(
    baseInput({
      driverBasis: "" as never,
      extraInformation: "Quotation excludes trailers\n\n  Agreed value basis  ",
    }),
  );

  assert.deepEqual(lines.split("\n"), [
    "Quotation excludes trailers",
    "Agreed value basis",
  ]);
});

test("nothing ticked and nothing typed produces nothing", () => {
  const { generateImportantInformation } = loadPolicyLetter();

  assert.equal(generateImportantInformation(baseInput({ driverBasis: "" as never })), "");
});

test("a typed driver basis overrides the dropdown selection", () => {
  const { generateImportantInformation } = loadPolicyLetter();

  const lines = generateImportantInformation(
    baseInput({
      driverBasisOverride: "Any driver for Business and named for SDP use",
    }),
  );

  assert.match(
    lines,
    /^Driver basis is Any driver for Business and named for SDP use$/m,
  );
  assert.doesNotMatch(lines, /Any Employee for Business use/);
});

test("extracted data fills the schedule-derived sections", () => {
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
    outputs.policyExcesses,
    "Material Damage - All Other Losses - £500\nRoad Risks - Windscreen - £150",
  );
});

test("sections stay empty when no PDF has been extracted", () => {
  const { generatePolicyLetterOutputs } = loadPolicyLetter();

  const outputs = generatePolicyLetterOutputs(null, baseInput());

  assert.equal(outputs.endorsementsAndConditions, "");
  assert.equal(outputs.significantExclusions, "");
  assert.equal(outputs.policyExcesses, "");
  assert.match(outputs.openingParagraph, /Thank you for getting in touch/);
});
