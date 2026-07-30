import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase, resetStore } from "./helpers/fake-supabase";

installFakeSupabase();

const USER = "user_test_reporting";

function wonQuote(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "q",
    user_id: USER,
    business_id: "b",
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    quote_type: "New Business",
    submission_date: "2026-01-01",
    stage: 6,
    notes: null,
    target_premium: null,
    last_year_premium: null,
    quoted_premium: 4000,
    initial_quoted_premium: null,
    commission: 600,
    outcome: "Won",
    closed_at: "2026-07-10",
    stage_entered_at: "2026-07-10T00:00:00.000Z",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

test("calendar quarters split on Jan, Apr, Jul and Oct", () => {
  const { quarterOf, quarterLabel } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  assert.deepEqual(quarterOf("2026-01-01"), { year: 2026, quarter: 1 });
  assert.deepEqual(quarterOf("2026-03-31"), { year: 2026, quarter: 1 });
  assert.deepEqual(quarterOf("2026-04-01"), { year: 2026, quarter: 2 });
  assert.deepEqual(quarterOf("2026-07-25"), { year: 2026, quarter: 3 });
  assert.deepEqual(quarterOf("2026-10-01"), { year: 2026, quarter: 4 });
  assert.deepEqual(quarterOf("2026-12-31"), { year: 2026, quarter: 4 });
  assert.equal(quarterOf("not a date"), null);
  assert.equal(quarterLabel({ year: 2026, quarter: 3 }), "Q3 26");
});

test("won totals count only won quotes and flag missing commission", () => {
  const { sumWon } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const totals = sumWon([
    wonQuote({ quoted_premium: 4000, commission: 600 }),
    wonQuote({ quoted_premium: 2500, commission: null }),
    wonQuote({ outcome: "Lost", quoted_premium: 9999, commission: 9999 }),
    wonQuote({ outcome: null, quoted_premium: 8888, commission: 8888 }),
  ] as never);

  assert.equal(totals.won, 2, "lost and open quotes are not counted");
  assert.equal(totals.premium, 6500);
  assert.equal(totals.commission, 600);
  assert.equal(totals.missingCommission, 1, "so the total is not silently short");
});

test("quarterly totals bucket wins by the date they closed", () => {
  const { quarterlyTotals } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const series = quarterlyTotals(
    [
      wonQuote({ closed_at: "2026-07-10", commission: 600, quoted_premium: 4000 }),
      wonQuote({ closed_at: "2026-07-20", commission: 400, quoted_premium: 2000 }),
      wonQuote({ closed_at: "2026-04-05", commission: 250, quoted_premium: 1500 }),
    ] as never,
    8,
    "2026-07-25",
  );

  assert.deepEqual(
    series.map((period) => period.label),
    ["Q2 26", "Q3 26"],
    "starts at the first win, not a fixed run of quarters before the book existed",
  );
  assert.equal(series[0].commission, 250);
  assert.equal(series[1].commission, 1000);
  assert.equal(series[1].won, 2);
  assert.equal(series[1].premium, 6000);
});

test("with nothing won yet, the chart is just this quarter", () => {
  const { quarterlyTotals } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  assert.deepEqual(
    quarterlyTotals([], 8, "2026-07-25").map((period) => period.label),
    ["Q3 26"],
    "a new book should not show quarters that predate it",
  );
});

test("empty quarters between wins are kept, and the run walks across a year", () => {
  const { quarterlyTotals } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const series = quarterlyTotals(
    [
      wonQuote({ closed_at: "2025-11-10", commission: 500 }),
      wonQuote({ closed_at: "2026-02-14", commission: 700 }),
    ] as never,
    8,
    "2026-02-20",
  );

  assert.deepEqual(
    series.map((period) => period.label),
    ["Q4 25", "Q1 26"],
  );
  assert.equal(series[0].commission, 500);
  assert.equal(series[1].commission, 700);
});

test("a long book is capped at the most recent quarters", () => {
  const { quarterlyTotals } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const series = quarterlyTotals(
    [wonQuote({ closed_at: "2020-01-05", commission: 100 })] as never,
    4,
    "2026-07-25",
  );

  assert.equal(series.length, 4, "capped rather than drawing 26 bars");
  assert.equal(
    series[series.length - 1].label,
    "Q3 26",
    "and it is the recent end that is kept",
  );
});

test("a win with no close date is left out of the chart but still counted", () => {
  const { quarterlyTotals, sumWon } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const quotes = [wonQuote({ closed_at: null, commission: 500 })] as never;

  assert.equal(sumWon(quotes).commission, 500);
  assert.equal(
    quarterlyTotals(quotes, 3, "2026-07-25").reduce(
      (total, period) => total + period.commission,
      0,
    ),
    0,
  );
});

test("setting an outcome dates the win, and clearing it removes the date", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = require(
    "../../lib/services/quotes",
  ) as typeof import("../../lib/services/quotes");
  const { todayIso } = require(
    "../../lib/reporting",
  ) as typeof import("../../lib/reporting");

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });

  assert.equal(quote.closed_at, null);

  const won = await updateQuoteWorkflow(USER, {
    id: quote.id,
    outcome: "Won",
  });

  assert.equal(won?.closed_at, todayIso());

  // Moving the stage afterwards must not shift which quarter it was won in.
  const moved = await updateQuoteWorkflow(USER, { id: quote.id, stage: 4 });

  assert.equal(moved?.closed_at, todayIso(), "the win keeps its date");

  const reopened = await updateQuoteWorkflow(USER, {
    id: quote.id,
    outcome: null,
  });

  assert.equal(reopened?.closed_at, null);
});

test("commission is stored against the quote", async () => {
  resetStore();
  const { createQuoteWorkflow, updateQuoteWorkflow } = require(
    "../../lib/services/quotes",
  ) as typeof import("../../lib/services/quotes");

  const quote = await createQuoteWorkflow(USER, {
    client_name: "Brookway Cars Ltd",
    insurer: "Covea",
    submission_date: "2026-07-24",
  });

  await updateQuoteWorkflow(USER, { id: quote.id, outcome: "Won" });
  const paid = await updateQuoteWorkflow(USER, {
    id: quote.id,
    commission: "725.50",
  });

  assert.equal(paid?.commission, 725.5);
  assert.equal(paid?.outcome, "Won", "recording commission leaves the rest alone");
});
