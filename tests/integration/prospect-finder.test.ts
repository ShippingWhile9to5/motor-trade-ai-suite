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

const USER = "user_test_finder";

const sampleCompany = {
  company_name: "Liverpool MOT Centre Ltd",
  company_number: "09876543",
  company_status: "active",
  date_of_creation: "2015-03-12",
  sic_codes: ["45200"],
  address_line_1: "Unit 4 Dock Road",
  locality: "Liverpool",
  postal_code: "L3 4AA",
};

test("companyToBusinessInput maps a result onto a prospect record", () => {
  const { companyToBusinessInput } = require(
    "../../lib/prospect-finder",
  ) as typeof import("../../lib/prospect-finder");

  const input = companyToBusinessInput(sampleCompany);

  assert.equal(input.name, "Liverpool MOT Centre Ltd");
  assert.equal(input.company_number, "09876543");
  assert.equal(input.company_status, "active");
  assert.equal(input.incorporated, "12/03/2015");
  assert.equal(input.location, "Liverpool");
  assert.equal(input.address, "Unit 4 Dock Road, Liverpool, L3 4AA");
  assert.equal(input.services, "45200");
  assert.equal(input.pipeline_status, "prospect");
  assert.equal(input.source, "finder");
});

test("saving a finder result creates a prospect business", async () => {
  resetStore();
  const { saveProspectFromFinderWorkflow } = require(
    "../../lib/services/prospect-finder",
  ) as typeof import("../../lib/services/prospect-finder");

  const outcome = await saveProspectFromFinderWorkflow(USER, sampleCompany);

  assert.equal(outcome.alreadySaved, false);
  assert.equal(outcome.business.name, "Liverpool MOT Centre Ltd");
  assert.equal(outcome.business.source, "finder");
  assert.equal(outcome.business.pipeline_status, "prospect");
  assert.equal(store.business.length, 1);
});

test("saving the same company again is deduped on company number", async () => {
  resetStore();
  const { saveProspectFromFinderWorkflow } = require(
    "../../lib/services/prospect-finder",
  ) as typeof import("../../lib/services/prospect-finder");

  const first = await saveProspectFromFinderWorkflow(USER, sampleCompany);
  const second = await saveProspectFromFinderWorkflow(USER, sampleCompany);

  assert.equal(second.alreadySaved, true);
  assert.equal(second.business.id, first.business.id);
  assert.equal(store.business.length, 1, "no duplicate created");
});

test("the same company saved by a different user is separate", async () => {
  resetStore();
  const { saveProspectFromFinderWorkflow } = require(
    "../../lib/services/prospect-finder",
  ) as typeof import("../../lib/services/prospect-finder");

  await saveProspectFromFinderWorkflow("user_a", sampleCompany);
  const other = await saveProspectFromFinderWorkflow("user_b", sampleCompany);

  assert.equal(other.alreadySaved, false);
  assert.equal(store.business.length, 2);
});

test("SIC code input is validated", async () => {
  const { searchCompaniesWorkflow } = require(
    "../../lib/services/prospect-finder",
  ) as typeof import("../../lib/services/prospect-finder");

  await assert.rejects(
    () => searchCompaniesWorkflow({ sic_code: "abc" }),
    /SIC code/,
  );
});
