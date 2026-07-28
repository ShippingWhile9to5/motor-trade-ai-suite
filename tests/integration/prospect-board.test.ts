import assert from "node:assert/strict";
import test from "node:test";
import {
  installFakeEnv,
  installFakeSupabase,
  resetStore,
  store,
} from "./helpers/fake-supabase";

installFakeEnv();
installFakeSupabase();

const USER = "user_test_board";

// Mirrors the shape exported by the standalone Prospect Board.
const legacyRecord = {
  id: "pmr56spyw4i68s",
  name: "B S Marson and Sons Limited",
  companyNumber: "02838635",
  companyStatus: "Active",
  incorporated: "22 July 1993",
  location: "Newcastle-under-Lyme, Staffordshire",
  address: "Deansgate Garage, Keele Road, Newcastle-under-Lyme, ST5 2HN",
  directors: [
    { name: "Edmund John Marson", role: "Director", appointed: "1993" },
  ],
  phone: "01782 622141",
  mobile: "",
  email: "andrewmarson@bsmarson.com",
  website: "bsmarson.co.uk",
  franchise: "Franchised: Fiat, Abarth, Leapmotor",
  services: "New/used sales, servicing, repairs, MOT",
  profile: "Family-run franchised dealer.",
  opportunity: "Combined Motor Trade, Road Risks, Premises.",
  approachAngle: "New Leapmotor franchise changes their risk profile.",
  rating: 4,
  pipelineStatus: "notcontacted",
  followUp: "",
  notes: "",
  tier: "",
  cadenceTier: "",
  cadenceStep: 0,
  nextActionText: "",
  activities: [],
};

test("legacy statuses collapse onto the shared five-stage spine", () => {
  const { mapLegacyPipelineStatus } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  assert.equal(mapLegacyPipelineStatus("notcontacted"), "prospect");
  assert.equal(mapLegacyPipelineStatus("called"), "contacted");
  assert.equal(mapLegacyPipelineStatus("renewaldate"), "contacted");
  assert.equal(mapLegacyPipelineStatus("factfind"), "contacted");
  assert.equal(mapLegacyPipelineStatus("submitted"), "quoting");
  assert.equal(mapLegacyPipelineStatus("quoted"), "quoting");
  assert.equal(mapLegacyPipelineStatus("won"), "won");
  assert.equal(mapLegacyPipelineStatus("dead"), "lost");
  assert.equal(mapLegacyPipelineStatus("something-unknown"), "prospect");
});

test("an imported record maps onto the business spine", () => {
  const { importedProspectToBusinessInput } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");
  const { importedProspectSchema } = require(
    "../../lib/schemas/prospect-import",
  ) as typeof import("../../lib/schemas/prospect-import");

  const input = importedProspectToBusinessInput(
    importedProspectSchema.parse(legacyRecord),
  );

  assert.equal(input.name, "B S Marson and Sons Limited");
  assert.equal(input.company_number, "02838635");
  assert.equal(input.rating, 4);
  assert.equal(input.pipeline_status, "prospect");
  assert.equal(input.source, "import");
  assert.equal(input.follow_up, null);
  assert.equal(input.directors.length, 1);
  assert.equal(input.directors[0].name, "Edmund John Marson");
});

test("notes, next action and activity log are folded together without repeats", () => {
  const { composeImportNotes } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");
  const { importedProspectSchema } = require(
    "../../lib/schemas/prospect-import",
  ) as typeof import("../../lib/schemas/prospect-import");

  const notes = composeImportNotes(
    importedProspectSchema.parse({
      ...legacyRecord,
      notes: "Call Fraser on Thursday as he is not in until then.\n9/7 - emailed",
      nextActionText: "Call Fraser on Thursday as he is not in until then.",
      activities: [
        {
          ts: "2026-07-06T09:17:28.924Z",
          type: "Call",
          note: "Call Fraser on Thursday as he is not in until then.",
        },
        { ts: "2026-07-08T09:00:00.000Z", type: "Email", note: "Sent details" },
      ],
    }),
  );

  const lines = notes.split("\n");

  // The line shared by notes/nextAction/activity appears exactly once.
  assert.equal(
    lines.filter((line) =>
      line.includes("Call Fraser on Thursday as he is not in until then."),
    ).length,
    1,
  );
  assert.ok(notes.includes("9/7 - emailed"));
  assert.ok(notes.includes("2026-07-08 · Email · Sent details"));
});

test("free text in the company-number box is split from the number", () => {
  const { splitCompanyNumber } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  assert.deepEqual(splitCompanyNumber("02838635"), {
    number: "02838635",
    note: "",
  });
  assert.deepEqual(splitCompanyNumber("SC058445"), {
    number: "SC058445",
    note: "",
  });
  assert.deepEqual(
    splitCompanyNumber("11888384 (The Chorley Group Ltd - verify entity)"),
    { number: "11888384", note: "(The Chorley Group Ltd - verify entity)" },
  );
  assert.deepEqual(splitCompanyNumber("Verify on CH before call"), {
    number: null,
    note: "Verify on CH before call",
  });
  assert.deepEqual(splitCompanyNumber(""), { number: null, note: "" });
});

test("a company-number reminder is kept as a note, not as the dedup key", () => {
  const { importedProspectToBusinessInput } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");
  const { importedProspectSchema } = require(
    "../../lib/schemas/prospect-import",
  ) as typeof import("../../lib/schemas/prospect-import");

  const input = importedProspectToBusinessInput(
    importedProspectSchema.parse({
      ...legacyRecord,
      companyNumber: "Verify on CH before call (trading since 1992)",
    }),
  );

  assert.equal(input.company_number, null);
  assert.ok(
    input.notes?.includes(
      "Company number: Verify on CH before call (trading since 1992)",
    ),
  );
});

test("a follow-up date survives the import", () => {
  const { importedProspectToBusinessInput } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");
  const { importedProspectSchema } = require(
    "../../lib/schemas/prospect-import",
  ) as typeof import("../../lib/schemas/prospect-import");

  const input = importedProspectToBusinessInput(
    importedProspectSchema.parse({
      ...legacyRecord,
      followUp: "2027-01-04",
      pipelineStatus: "called",
    }),
  );

  assert.equal(input.follow_up, "2027-01-04");
  assert.equal(input.pipeline_status, "contacted");
});

test("importing a backup creates one business per record", async () => {
  resetStore();
  const { importProspectsWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  const result = await importProspectsWorkflow(USER, [
    legacyRecord,
    { ...legacyRecord, name: "Hawkins Motors Limited", companyNumber: "00123456" },
  ]);

  assert.equal(result.imported.length, 2);
  assert.equal(result.skipped.length, 0);
  assert.equal(store.business.length, 2);
});

test("re-importing the same backup skips rather than duplicates", async () => {
  resetStore();
  const { importProspectsWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  await importProspectsWorkflow(USER, [legacyRecord]);
  const second = await importProspectsWorkflow(USER, [legacyRecord]);

  assert.equal(second.imported.length, 0);
  assert.equal(second.skipped.length, 1);
  assert.equal(store.business.length, 1, "no duplicate created");
});

test("a record with no company number dedupes on name", async () => {
  resetStore();
  const { importProspectsWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  const noNumber = { ...legacyRecord, companyNumber: "" };

  await importProspectsWorkflow(USER, [noNumber]);
  const second = await importProspectsWorkflow(USER, [noNumber]);

  assert.equal(second.skipped.length, 1);
  assert.equal(store.business.length, 1);
});

test("an import is scoped to the user who ran it", async () => {
  resetStore();
  const { importProspectsWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  await importProspectsWorkflow("user_a", [legacyRecord]);
  const other = await importProspectsWorkflow("user_b", [legacyRecord]);

  assert.equal(other.imported.length, 1, "a second user gets their own copy");
  assert.equal(store.business.length, 2);
});

test("a manually added prospect stores blanks as null", async () => {
  resetStore();
  const { createBusinessWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  const business = await createBusinessWorkflow(USER, {
    name: "  Liverpool MOT Centre  ",
    phone: "0151 000 0000",
    location: "",
    follow_up: "",
    source: "manual",
  });

  assert.equal(business.name, "Liverpool MOT Centre");
  assert.equal(business.phone, "0151 000 0000");
  assert.equal(business.location, null, "an empty box is stored as null");
  assert.equal(business.follow_up, null);
  assert.equal(business.pipeline_status, "prospect");
  assert.equal(business.source, "manual");
});

test("a follow-up must be a real date", async () => {
  const { updateBusinessWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  await assert.rejects(
    () =>
      updateBusinessWorkflow(USER, {
        id: "11111111-1111-4111-8111-111111111111",
        follow_up: "next Tuesday",
      }),
    /Follow-up must be a date/,
  );
});

test("editing a prospect cannot reach another user's record", async () => {
  resetStore();
  const { createBusinessWorkflow, updateBusinessWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  const mine = await createBusinessWorkflow("user_a", { name: "Mine Ltd" });
  const result = await updateBusinessWorkflow("user_b", {
    id: mine.id,
    notes: "should not apply",
  });

  assert.equal(result, null);
  assert.equal(store.business[0].notes, null, "the record is untouched");
});

test("deleting a prospect cannot reach another user's record", async () => {
  resetStore();
  const { createBusinessWorkflow, deleteBusinessWorkflow } = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");

  const mine = await createBusinessWorkflow("user_a", { name: "Mine Ltd" });
  await deleteBusinessWorkflow("user_b", { id: mine.id });

  assert.equal(store.business.length, 1, "another user cannot delete it");

  await deleteBusinessWorkflow("user_a", { id: mine.id });

  assert.equal(store.business.length, 0);
});

test("alphabetical order ignores case and sorts real company names", () => {
  const { sortBusinesses } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  const named = (name: string) =>
    ({ name, rating: null, follow_up: null }) as never;

  assert.deepEqual(
    sortBusinesses(
      [
        named("Vospers Motor House Limited"),
        named("b s marson and sons limited"),
        named("Chapel House Motor Co Ltd"),
        named("À La Carte Motors"),
      ],
      "name",
    ).map((row) => row.name),
    [
      "À La Carte Motors",
      "b s marson and sons limited",
      "Chapel House Motor Co Ltd",
      "Vospers Motor House Limited",
    ],
    "localeCompare handles lower case and accents, which a raw < would not",
  );
});

test("follow-up flags fire on due and overdue, but not once closed", () => {
  const { getFollowUpState } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  const today = "2026-07-25";

  assert.equal(
    getFollowUpState({ follow_up: "2026-07-24", pipeline_status: "contacted" }, today),
    "overdue",
  );
  assert.equal(
    getFollowUpState({ follow_up: "2026-07-25", pipeline_status: "contacted" }, today),
    "due",
  );
  assert.equal(
    getFollowUpState({ follow_up: "2026-07-26", pipeline_status: "contacted" }, today),
    "upcoming",
  );
  assert.equal(
    getFollowUpState({ follow_up: null, pipeline_status: "contacted" }, today),
    "none",
  );
  assert.equal(
    getFollowUpState({ follow_up: "2026-07-01", pipeline_status: "won" }, today),
    "none",
    "a won firm is off the chase list",
  );
  assert.equal(
    getFollowUpState({ follow_up: "2026-07-01", pipeline_status: "lost" }, today),
    "none",
  );
});

test("search matches name, town and director; sort puts undated last", () => {
  const { filterBusinesses, sortBusinesses } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  const base = {
    id: "x",
    user_id: USER,
    company_number: null,
    company_status: null,
    incorporated: null,
    address: null,
    directors: [],
    phone: null,
    mobile: null,
    email: null,
    website: null,
    franchise: null,
    services: null,
    profile: null,
    opportunity: null,
    approach_angle: null,
    rating: null,
    follow_up: null,
    notes: null,
    source: "manual" as const,
    created_at: "",
    updated_at: "",
  };

  const rows = [
    {
      ...base,
      id: "a",
      name: "Alpha Motors",
      location: "Liverpool",
      pipeline_status: "prospect" as const,
      rating: 3,
      follow_up: "2026-08-01",
    },
    {
      ...base,
      id: "b",
      name: "Beta Garage",
      location: "Leeds",
      pipeline_status: "contacted" as const,
      rating: 5,
      directors: [{ name: "Fraser Smith", role: "", appointed: "" }],
    },
  ];

  const byTown = filterBusinesses(rows, {
    search: "liverpool",
    status: "",
    onlyDue: false,
  });
  assert.deepEqual(byTown.map((row) => row.id), ["a"]);

  const byDirector = filterBusinesses(rows, {
    search: "fraser",
    status: "",
    onlyDue: false,
  });
  assert.deepEqual(byDirector.map((row) => row.id), ["b"]);

  const byStatus = filterBusinesses(rows, {
    search: "",
    status: "contacted",
    onlyDue: false,
  });
  assert.deepEqual(byStatus.map((row) => row.id), ["b"]);

  assert.deepEqual(
    sortBusinesses(rows, "rating").map((row) => row.id),
    ["b", "a"],
  );
  assert.deepEqual(
    sortBusinesses(rows, "name").map((row) => row.id),
    ["a", "b"],
    "alphabetical is the board's default order",
  );
  assert.deepEqual(
    sortBusinesses(rows, "followUp").map((row) => row.id),
    ["a", "b"],
    "records with no follow-up sink to the bottom",
  );
});
