import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase } from "./helpers/fake-supabase";

installFakeSupabase();

function policy(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "q1",
    user_id: "u",
    business_id: "b1",
    client_name: "Brookway Cars Ltd",
    insurer: "NIG",
    quote_type: "New Business",
    policy_type: "Motor Trade Combined",
    submission_date: "2025-09-01",
    stage: 6,
    notes: null,
    target_premium: null,
    last_year_premium: null,
    quoted_premium: 4200,
    initial_quoted_premium: null,
    commission: 630,
    fee: 50,
    outcome: "Won",
    closed_at: "2025-09-20",
    cover_start: "2025-10-01",
    stage_entered_at: "",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

test("a policy renews twelve months after it went on cover", () => {
  const { renewalDateOf } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  assert.equal(renewalDateOf("2025-10-01"), "2026-10-01");
  assert.equal(renewalDateOf("2026-01-31"), "2027-01-31");
  // A leap day inception lands on 1 March the following year, as an insurer
  // would date it.
  assert.equal(renewalDateOf("2024-02-29"), "2025-03-01");
  assert.equal(renewalDateOf("not a date"), null);
});

test("a renewal shows a month out, and not before", () => {
  const { upcomingRenewals } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  const quotes = [policy({ cover_start: "2025-10-01" })] as never;

  assert.equal(
    upcomingRenewals(quotes, "2026-08-31").length,
    0,
    "31 days out is still too early to be shouting about it",
  );
  assert.equal(upcomingRenewals(quotes, "2026-09-01").length, 1, "30 days out");

  const [renewal] = upcomingRenewals(quotes, "2026-09-11");

  assert.equal(renewal.renewalDate, "2026-10-01");
  assert.equal(renewal.daysAway, 20);
  assert.equal(renewal.clientName, "Brookway Cars Ltd");
  assert.equal(renewal.insurer, "NIG");
});

test("a renewal drops off as soon as the quote is raised", () => {
  const { upcomingRenewals } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  const withoutQuote = [policy()] as never;

  assert.equal(upcomingRenewals(withoutQuote, "2026-09-11").length, 1);

  // Raising the quote is the thing the reminder was asking for, so it has
  // served its purpose — the quote's own SLA clock takes over from here.
  const withQuote = [
    policy(),
    policy({ id: "q2", outcome: null, closed_at: null, cover_start: null, stage: 1 }),
  ] as never;

  assert.equal(upcomingRenewals(withQuote, "2026-09-11").length, 0);
});

test("a policy with no cover date never fires a reminder", () => {
  const { upcomingRenewals } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  // Guessing the date from the win would put the reminder on the wrong day,
  // so a blank one stays silent until it is filled in.
  assert.deepEqual(
    upcomingRenewals([policy({ cover_start: null })] as never, "2026-09-11"),
    [],
  );
});

test("only won policies renew", () => {
  const { upcomingRenewals } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  assert.deepEqual(
    upcomingRenewals(
      [
        policy({ id: "a", outcome: "Lost" }),
        policy({ id: "b", outcome: "NTU" }),
      ] as never,
      "2026-09-11",
    ),
    [],
  );
});

test("a renewal already past its date sorts to the top", () => {
  const { upcomingRenewals } = require(
    "../../lib/renewals",
  ) as typeof import("../../lib/renewals");

  const renewals = upcomingRenewals(
    [
      policy({ id: "a", business_id: "b1", client_name: "Due in a week", cover_start: "2025-09-18" }),
      policy({ id: "b", business_id: "b2", client_name: "Already gone", cover_start: "2025-09-05" }),
    ] as never,
    "2026-09-11",
  );

  assert.deepEqual(
    renewals.map((row) => row.clientName),
    ["Already gone", "Due in a week"],
  );
  assert.ok(renewals[0].daysAway < 0, "past its renewal date");
});

test("a renewal reaches the Today list as its own kind of row", () => {
  const { buildTodayList } = require(
    "../../lib/today",
  ) as typeof import("../../lib/today");

  const items = buildTodayList(
    {
      reminders: [],
      businesses: [
        {
          id: "b1",
          user_id: "u",
          name: "Brookway Cars Ltd",
          pipeline_status: "won",
          follow_up: null,
        },
      ] as never,
      quotes: [policy()] as never,
    },
    "2026-09-11",
  );

  const renewal = items.find((item) => item.kind === "renewal");

  assert.ok(renewal, "renewals show up alongside reminders and call-backs");
  assert.equal(renewal?.title, "Brookway Cars Ltd");
  assert.equal(renewal?.businessId, "b1", "so Open can attach the firm");
  assert.equal(renewal?.overdue, false);
  assert.match(renewal?.detail ?? "", /Renews 2026-10-01/);
});
