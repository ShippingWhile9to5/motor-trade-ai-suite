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
  // Stage 4, with the client: amber at 3, red at 5.
  assert.equal(getUrgency(4, daysAgo(3)), "amber");
  assert.equal(getUrgency(4, daysAgo(5)), "red");
  // Stage 5, back with the insurer for a revised price: same thresholds.
  assert.equal(getUrgency(5, daysAgo(3)), "amber");
  assert.equal(getUrgency(5, daysAgo(5)), "red");
  // Closed is never urgent.
  assert.equal(getUrgency(6, daysAgo(99)), "none");
  // Neither is a quote that already has an outcome, wherever it sits.
  assert.equal(getUrgency(3, daysAgo(99), "Won"), "none");
  assert.equal(getUrgency(4, daysAgo(99), "Lost"), "none");
  assert.equal(getUrgency(4, daysAgo(99), null), "red");
});

test("picking a firm attaches the quote to that exact record", async () => {
  resetStore();
  const { createQuoteWorkflow, createBusinessWorkflow, listBusinessesWorkflow } =
    loadServices();

  const firm = await createBusinessWorkflow(USER, {
    name: "Croxdale Service Station Limited (Croxdale Group)",
    pipeline_status: "contacted",
  });

  const quote = await createQuoteWorkflow(USER, {
    business_id: firm.id,
    insurer: "NIG",
    submission_date: "2026-07-26",
  });

  assert.equal(quote.business_id, firm.id);
  assert.equal(quote.client_name, firm.name);

  const businesses = await listBusinessesWorkflow(USER);
  assert.equal(businesses.length, 1, "no second firm was created");
  assert.equal(businesses[0].pipeline_status, "quoting");
});

test("a typed name that nearly matches would have made a duplicate", async () => {
  resetStore();
  const { createQuoteWorkflow, createBusinessWorkflow, listBusinessesWorkflow } =
    loadServices();

  const firm = await createBusinessWorkflow(USER, {
    name: "Croxdale Service Station Limited (Croxdale Group)",
  });

  // The old behaviour, kept for a client who genuinely isn't on the board.
  await createQuoteWorkflow(USER, {
    client_name: "Croxdale Service Station",
    insurer: "NIG",
    submission_date: "2026-07-26",
  });

  assert.equal(
    (await listBusinessesWorkflow(USER)).length,
    2,
    "which is exactly why the picker exists",
  );

  // Picking the firm instead reuses it.
  await createQuoteWorkflow(USER, {
    business_id: firm.id,
    insurer: "Covea",
    submission_date: "2026-07-26",
  });

  assert.equal((await listBusinessesWorkflow(USER)).length, 2);
});

test("you cannot attach a quote to someone else's client", async () => {
  resetStore();
  const { createQuoteWorkflow, createBusinessWorkflow } = loadServices();

  const theirs = await createBusinessWorkflow("user_other", {
    name: "Not Yours Ltd",
  });

  await assert.rejects(
    () =>
      createQuoteWorkflow(USER, {
        business_id: theirs.id,
        insurer: "NIG",
        submission_date: "2026-07-26",
      }),
    /could not be found/,
  );
});

test("a quote needs either a picked firm or a typed name", async () => {
  const { createQuoteWorkflow } = loadServices();

  await assert.rejects(
    () =>
      createQuoteWorkflow(USER, {
        insurer: "NIG",
        submission_date: "2026-07-26",
      }),
    /Pick a client/,
  );
});

test("an outcome closes the quote and stops it asking to be chased", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();
  const { getUrgency, CLOSED_STAGE } = require(
    "../../lib/quote-tracker",
  ) as typeof import("../../lib/quote-tracker");

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });

  // Sitting in "Sent to Client", well past the red threshold.
  await updateQuoteWorkflow(USER, { id: quote.id, stage: 4 });
  store.quote[0].stage_entered_at = new Date(
    Date.now() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const won = await updateQuoteWorkflow(USER, { id: quote.id, outcome: "Won" });

  assert.equal(won?.stage, CLOSED_STAGE, "a won quote closes itself");
  assert.equal(
    getUrgency(won!.stage, won!.stage_entered_at, won!.outcome),
    "none",
    "and stops nagging",
  );
});

test("an explicit stage wins over the automatic close", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });

  const updated = await updateQuoteWorkflow(USER, {
    id: quote.id,
    outcome: "Won",
    stage: 3,
  });

  assert.equal(updated?.stage, 3);
});

test("the first quoted price is kept when a negotiation reduces it", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });

  const first = await updateQuoteWorkflow(USER, {
    id: quote.id,
    quoted_premium: "4500",
  });

  assert.equal(first?.quoted_premium, 4500);
  assert.equal(first?.initial_quoted_premium, 4500, "captured without retyping");

  const reduced = await updateQuoteWorkflow(USER, {
    id: quote.id,
    quoted_premium: "3800",
  });

  assert.equal(reduced?.quoted_premium, 3800);
  assert.equal(
    reduced?.initial_quoted_premium,
    4500,
    "the haggling does not erase what it started at",
  );

  // A second reduction still leaves the original alone.
  const again = await updateQuoteWorkflow(USER, {
    id: quote.id,
    quoted_premium: "3600",
  });

  assert.equal(again?.initial_quoted_premium, 4500);
});

test("editing one field leaves the other premiums alone", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
    target_premium: "3200",
    last_year_premium: "2900",
  });

  // Changing the stage must not disturb figures it was never given.
  const moved = await updateQuoteWorkflow(USER, { id: quote.id, stage: 3 });

  assert.equal(moved?.target_premium, 3200);
  assert.equal(moved?.last_year_premium, 2900);

  const closed = await updateQuoteWorkflow(USER, {
    id: quote.id,
    outcome: "Won",
  });

  assert.equal(closed?.target_premium, 3200);
  assert.equal(closed?.last_year_premium, 2900);
});

test("the policy type can be corrected after the quote is closed", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  // A quote raised before the product was recorded — which is every win
  // already on the board.
  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
    policy_type: null,
    quoted_premium: "4200",
  });

  await updateQuoteWorkflow(USER, { id: quote.id, outcome: "Won" });

  const named = await updateQuoteWorkflow(USER, {
    id: quote.id,
    policy_type: "Contractors Combined",
  });

  assert.equal(named?.policy_type, "Contractors Combined");
  assert.equal(named?.outcome, "Won", "correcting it does not reopen the quote");
  assert.equal(named?.quoted_premium, 4200, "nor disturb the figures");

  // Free text, for a cover that is not on the list.
  const typed = await updateQuoteWorkflow(USER, {
    id: quote.id,
    policy_type: "Cyber",
  });

  assert.equal(typed?.policy_type, "Cyber");
});

test("a premium can still be deliberately cleared", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
    target_premium: "3200",
  });

  const cleared = await updateQuoteWorkflow(USER, {
    id: quote.id,
    target_premium: "",
  });

  assert.equal(cleared?.target_premium, null, "an emptied box still clears it");
});

test("a mistyped first price can be corrected by hand", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = loadServices();

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
    quoted_premium: "450",
  });

  assert.equal(quote.initial_quoted_premium, 450);

  const fixed = await updateQuoteWorkflow(USER, {
    id: quote.id,
    quoted_premium: "4500",
    initial_quoted_premium: "4500",
  });

  assert.equal(fixed?.initial_quoted_premium, 4500);
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

test("one submission to several insurers makes a card each, on one firm", async () => {
  resetStore();
  const { createQuotesWorkflow, listBusinessesWorkflow } = loadServices();

  const quotes = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea", "Jensten", "Unicorn"],
    submission_date: "2026-07-24",
    target_premium: "3200",
  });

  assert.equal(quotes.length, 4);
  assert.deepEqual(
    quotes.map((quote) => quote.insurer),
    ["NIG", "Covea", "Jensten", "Unicorn"],
  );

  // Everything but the insurer is shared, because it is one risk going out.
  for (const quote of quotes) {
    assert.equal(quote.client_name, "Brookway Cars Ltd");
    assert.equal(quote.submission_date, "2026-07-24");
    assert.equal(quote.target_premium, 3200);
    assert.equal(quote.stage, 1);
  }

  const businesses = await listBusinessesWorkflow(USER);
  const named = businesses.filter((firm) => firm.name === "Brookway Cars Ltd");

  assert.equal(named.length, 1, "four insurers must not make four firms");
  assert.equal(named[0].pipeline_status, "quoting");
  assert.equal(
    new Set(quotes.map((quote) => quote.business_id)).size,
    1,
    "and all four hang off it",
  );
});

test("the same insurer picked twice only gets one card", async () => {
  resetStore();
  const { createQuotesWorkflow } = loadServices();

  const quotes = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea", "NIG"],
    submission_date: "2026-07-24",
  });

  assert.deepEqual(
    quotes.map((quote) => quote.insurer),
    ["NIG", "Covea"],
  );
});

test("placing the risk with one insurer closes the rest as NTU", async () => {
  resetStore();
  const { createQuotesWorkflow, updateQuoteWorkflow, listQuotesWithClientsWorkflow } =
    loadServices();

  const [nig, covea, jensten] = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea", "Jensten"],
    submission_date: "2026-07-24",
  });

  // One insurer has already declined by hand before the winner is picked.
  await updateQuoteWorkflow(USER, { id: jensten.id, outcome: "Lost" });
  await updateQuoteWorkflow(USER, { id: nig.id, outcome: "Won" });

  const all = await listQuotesWithClientsWorkflow(USER);
  const byId = new Map(all.map((quote) => [quote.id, quote]));

  assert.equal(byId.get(nig.id)?.outcome, "Won");
  assert.equal(byId.get(covea.id)?.outcome, "NTU", "closed on its own");
  assert.equal(byId.get(covea.id)?.stage, 6, "and off the live board");
  assert.equal(byId.get(covea.id)?.closed_at, "2026-07-31");
  assert.equal(
    byId.get(jensten.id)?.outcome,
    "Lost",
    "an outcome already set is left as it was",
  );
});

test("winning leaves the client won, not lost by its own losing quotes", async () => {
  resetStore();
  const { createQuotesWorkflow, updateQuoteWorkflow, listBusinessesWorkflow } =
    loadServices();

  const [nig, covea] = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea"],
    submission_date: "2026-07-24",
  });

  await updateQuoteWorkflow(USER, { id: nig.id, outcome: "Won" });

  const afterWin = await listBusinessesWorkflow(USER);

  assert.equal(afterWin[0].pipeline_status, "won", "the NTU must not demote it");

  // And closing a loser by hand afterwards must not demote it either.
  await updateQuoteWorkflow(USER, { id: covea.id, outcome: "NTU" });

  const afterClosing = await listBusinessesWorkflow(USER);

  assert.equal(afterClosing[0].pipeline_status, "won");
});

test("losing every insurer still marks the client lost", async () => {
  resetStore();
  const { createQuotesWorkflow, updateQuoteWorkflow, listBusinessesWorkflow } =
    loadServices();

  const [nig, covea] = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea"],
    submission_date: "2026-07-24",
  });

  await updateQuoteWorkflow(USER, { id: nig.id, outcome: "Lost" });
  await updateQuoteWorkflow(USER, { id: covea.id, outcome: "Lost" });

  const businesses = await listBusinessesWorkflow(USER);

  assert.equal(businesses[0].pipeline_status, "lost");
});

test("a separate submission for the same firm is left alone", async () => {
  resetStore();
  const { createQuotesWorkflow, updateQuoteWorkflow, listQuotesWithClientsWorkflow } =
    loadServices();

  const [nig] = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["NIG", "Covea"],
    submission_date: "2026-07-24",
  });

  // The same firm, a different risk, sent out on a different day.
  const [aviva] = await createQuotesWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurers: ["Aviva"],
    submission_date: "2026-09-01",
  });

  await updateQuoteWorkflow(USER, { id: nig.id, outcome: "Won" });

  const all = await listQuotesWithClientsWorkflow(USER);
  const other = all.find((quote) => quote.id === aviva.id);

  assert.equal(other?.outcome, null, "winning one risk does not close another");
  assert.equal(other?.stage, 1);
});

test("cards group by submission, so a client is one line per stage", () => {
  const { groupBySubmission } = require(
    "../../lib/quote-tracker",
  ) as typeof import("../../lib/quote-tracker");

  const groups = groupBySubmission([
    { business_id: "b1", submission_date: "2026-07-24", client_name: "Brookway", insurer: "NIG" },
    { business_id: "b2", submission_date: "2026-07-24", client_name: "Marson", insurer: "NIG" },
    { business_id: "b1", submission_date: "2026-07-24", client_name: "Brookway", insurer: "Covea" },
    // Same firm, different day out — a different risk, kept apart.
    { business_id: "b1", submission_date: "2026-09-01", client_name: "Brookway", insurer: "Aviva" },
  ]);

  assert.deepEqual(
    groups.map((group) => [group.clientName, group.quotes.length]),
    [
      ["Brookway", 2],
      ["Marson", 1],
      ["Brookway", 1],
    ],
    "in the order they arrived, so the caller's sort still decides",
  );
  assert.deepEqual(
    groups[0].quotes.map((quote) => quote.insurer),
    ["NIG", "Covea"],
  );
});
