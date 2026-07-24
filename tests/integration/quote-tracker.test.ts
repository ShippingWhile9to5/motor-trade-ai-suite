import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase, resetStore, store } from "./helpers/fake-supabase";

installFakeSupabase();

const USER = "user_test_quote";

function loadServices() {
  const quotes = require(
    "../../lib/services/quotes",
  ) as typeof import("../../lib/services/quotes");
  const businesses = require(
    "../../lib/services/businesses",
  ) as typeof import("../../lib/services/businesses");
  return { ...quotes, ...businesses };
}

test("quote tracker: pure SLA urgency engine", () => {
  const { getUrgency } = require(
    "../../lib/quote-tracker",
  ) as typeof import("../../lib/quote-tracker");

  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  // Stages 1/2 wait on the insurer — never flagged.
  assert.equal(getUrgency(1, daysAgo(30)), "none");
  assert.equal(getUrgency(2, daysAgo(30)), "none");
  // Stage 3: amber at 1 day, red at 2.
  assert.equal(getUrgency(3, daysAgo(0)), "none");
  assert.equal(getUrgency(3, daysAgo(1)), "amber");
  assert.equal(getUrgency(3, daysAgo(2)), "red");
  // Stage 4: amber at 3, red at 5.
  assert.equal(getUrgency(4, daysAgo(3)), "amber");
  assert.equal(getUrgency(4, daysAgo(5)), "red");
  // Closed is never urgent.
  assert.equal(getUrgency(5, daysAgo(99)), "none");
});

test("creating a quote creates the client and sets it to quoting", async () => {
  resetStore();
  const { createQuoteWorkflow, listBusinessesWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
    target_premium: "3200",
  });

  assert.equal(quote.client_name, "Brookway Cars Ltd");
  assert.equal(quote.insurer, "Covea");
  assert.equal(quote.stage, 1);
  assert.equal(quote.target_premium, 3200);

  const businesses = await listBusinessesWorkflow(USER);
  assert.equal(businesses.length, 1);
  assert.equal(businesses[0].name, "Brookway Cars Ltd");
  assert.equal(businesses[0].pipeline_status, "quoting");
});

test("a second quote for the same client reuses the business", async () => {
  resetStore();
  const { createQuoteWorkflow, listBusinessesWorkflow } = loadServices();

  await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });
  // Different casing/spacing must still match the same client.
  await createQuoteWorkflow(USER, {
    client_name: "brookway cars ltd",
    insurer: "Aviva",
    submission_date: "2026-07-25",
  });

  const businesses = await listBusinessesWorkflow(USER);
  assert.equal(businesses.length, 1, "should not duplicate the client");
  assert.equal(store.quote.length, 2, "both quotes exist");
});

test("listing quotes joins each to its client name", async () => {
  resetStore();
  const { createQuoteWorkflow, listQuotesWithClientsWorkflow } = loadServices();

  await createQuoteWorkflow(USER, {
    client_name: "AutoHub Northwest",
    insurer: "Niche",
    submission_date: "2026-07-24",
  });

  const rows = await listQuotesWithClientsWorkflow(USER);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].client_name, "AutoHub Northwest");
});

test("moving to a new stage restarts the SLA clock", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Test Motors",
    insurer: "AXA",
    submission_date: "2026-07-24",
  });

  // Backdate the stage clock, then move stage — it should reset to ~now.
  store.quote[0].stage_entered_at = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updated = await updateQuoteWorkflow(USER, { id: quote.id, stage: 3 });
  assert.ok(updated);
  assert.equal(updated?.stage, 3);

  const enteredAgo =
    Date.now() - new Date(updated!.stage_entered_at).getTime();
  assert.ok(enteredAgo < 60_000, "stage_entered_at was reset to now");
});

test("a Won outcome flips the client to won; Lost flips it to lost", async () => {
  resetStore();
  const {
    createQuoteWorkflow,
    updateQuoteWorkflow,
    listBusinessesWorkflow,
  } = loadServices();

  const won = await createQuoteWorkflow(USER, {
    client_name: "Winners Garage",
    insurer: "Intact",
    submission_date: "2026-07-24",
  });
  await updateQuoteWorkflow(USER, { id: won.id, outcome: "Won" });

  const lost = await createQuoteWorkflow(USER, {
    client_name: "Nearly Ltd",
    insurer: "Arch",
    submission_date: "2026-07-24",
  });
  await updateQuoteWorkflow(USER, { id: lost.id, outcome: "NTU" });

  const businesses = await listBusinessesWorkflow(USER);
  const byName = new Map(businesses.map((b) => [b.name, b.pipeline_status]));
  assert.equal(byName.get("Winners Garage"), "won");
  assert.equal(byName.get("Nearly Ltd"), "lost");
});

test("quotes are scoped to their owner", async () => {
  resetStore();
  const { createQuoteWorkflow, listQuotesWithClientsWorkflow } = loadServices();

  await createQuoteWorkflow("user_a", {
    client_name: "A Motors",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });
  await createQuoteWorkflow("user_b", {
    client_name: "B Motors",
    insurer: "Aviva",
    submission_date: "2026-07-24",
  });

  const aRows = await listQuotesWithClientsWorkflow("user_a");
  assert.equal(aRows.length, 1);
  assert.equal(aRows[0].client_name, "A Motors");
});
