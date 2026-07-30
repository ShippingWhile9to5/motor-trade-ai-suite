import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase } from "./helpers/fake-supabase";

installFakeSupabase();

function won(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "q1",
    user_id: "u",
    business_id: "b1",
    client_name: "B S Marson and Sons Limited",
    insurer: "NIG",
    quote_type: "New Business",
    policy_type: "Motor Trade Combined",
    submission_date: "2026-05-01",
    stage: 6,
    notes: null,
    target_premium: null,
    last_year_premium: null,
    quoted_premium: 4200,
    initial_quoted_premium: null,
    commission: 630,
    fee: 50,
    outcome: "Won",
    closed_at: "2026-07-10",
    stage_entered_at: "",
    created_at: "",
    updated_at: "",
    ...over,
  };
}

const Q3_26 = { year: 2026, quarter: 3 } as const;

test("total income is commission plus fee, and the share is a fifth of it", () => {
  const { commissionRowFor, BROKER_SHARE } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const row = commissionRowFor(won({ commission: 630, fee: 50 }) as never);

  assert.equal(row.totalIncome, 680);
  assert.equal(row.share, 136);
  assert.equal(BROKER_SHARE, 0.2);
  assert.equal(row.policyType, "Motor Trade Combined");
  assert.equal(row.grossPremium, 4200);
});

test("a missing fee counts as nothing, not as a broken total", () => {
  const { commissionRowFor } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const row = commissionRowFor(won({ commission: 500, fee: null }) as never);

  assert.equal(row.feeIncome, null, "still shown as blank, not zero");
  assert.equal(row.totalIncome, 500);
  assert.equal(row.share, 100);
});

test("only wins closed in the chosen quarter are returned", () => {
  const { commissionRowsForQuarter } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const rows = commissionRowsForQuarter(
    [
      won({ id: "a", client_name: "In quarter", closed_at: "2026-07-10" }),
      won({ id: "b", client_name: "Last quarter", closed_at: "2026-04-10" }),
      won({ id: "c", client_name: "Lost", outcome: "Lost" }),
      won({ id: "d", client_name: "Still open", outcome: null, closed_at: null }),
    ] as never,
    Q3_26,
  );

  assert.deepEqual(rows.map((row) => row.policyholder), ["In quarter"]);
});

test("rows come out alphabetically, as the sheet is read", () => {
  const { commissionRowsForQuarter } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const rows = commissionRowsForQuarter(
    [
      won({ id: "a", client_name: "Wilsons Automobiles" }),
      won({ id: "b", client_name: "Adam Sykes & Co." }),
      won({ id: "c", client_name: "Mangoletsi (Holdings) Limited" }),
    ] as never,
    Q3_26,
  );

  assert.deepEqual(rows.map((row) => row.policyholder), [
    "Adam Sykes & Co.",
    "Mangoletsi (Holdings) Limited",
    "Wilsons Automobiles",
  ]);
});

test("totals add up and flag anything missing a commission", () => {
  const { commissionRowsForQuarter, commissionTotals } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const totals = commissionTotals(
    commissionRowsForQuarter(
      [
        won({ id: "a", quoted_premium: 4200, commission: 630, fee: 50 }),
        won({ id: "b", quoted_premium: 5800, commission: 870, fee: null }),
        won({ id: "c", quoted_premium: 3100, commission: null, fee: 25 }),
      ] as never,
      Q3_26,
    ),
  );

  assert.equal(totals.grossPremium, 13100);
  assert.equal(totals.commissionIncome, 1500);
  assert.equal(totals.feeIncome, 75);
  assert.equal(totals.totalIncome, 1575);
  assert.equal(totals.share, 315);
  assert.equal(totals.missingCommission, 1);
});

test("the export is tab separated so it drops into Excel columns", () => {
  const { formatCommissionTsv, commissionRowsForQuarter } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const text = formatCommissionTsv(
    commissionRowsForQuarter(
      [won({ quoted_premium: 4200, commission: 630, fee: 50 })] as never,
      Q3_26,
    ),
    Q3_26,
  );

  const lines = text.split("\n");

  assert.deepEqual(lines[0].split("\t"), [
    "Policyholder",
    "Policy type",
    "Insurers",
    "Gross premium",
    "Commission income",
    "Fee income",
    "Total income",
    "20%",
  ]);
  assert.deepEqual(lines[1].split("\t"), [
    "B S Marson and Sons Limited",
    "Motor Trade Combined",
    "NIG",
    "4200.00",
    "630.00",
    "50.00",
    "680.00",
    "136.00",
  ]);
  assert.equal(
    lines[2].split("\t")[0],
    "Total Q3 26",
    "with a totals row the manager can check against",
  );
  assert.equal(lines[2].split("\t")[7], "136.00");
  assert.ok(!text.includes("£"), "no currency symbol — Excel wants a number");
});

test("a blank figure exports as empty rather than a misleading zero", () => {
  const { formatCommissionTsv, commissionRowsForQuarter } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const text = formatCommissionTsv(
    commissionRowsForQuarter(
      [won({ commission: null, fee: null, quoted_premium: null })] as never,
      Q3_26,
    ),
    Q3_26,
  );

  const cells = text.split("\n")[1].split("\t");

  assert.equal(cells[3], "", "gross premium");
  assert.equal(cells[4], "", "commission income");
  assert.equal(cells[5], "", "fee income");
  assert.equal(cells[6], "0.00", "but the computed total is still a number");
});

test("the quarter list offers this quarter plus any that have wins", () => {
  const { quartersWithWins } = require(
    "../../lib/commission",
  ) as typeof import("../../lib/commission");

  const quarters = quartersWithWins(
    [
      won({ id: "a", closed_at: "2026-07-10" }),
      won({ id: "b", closed_at: "2025-11-02" }),
      won({ id: "c", closed_at: "2026-04-01" }),
      won({ id: "d", outcome: "Lost", closed_at: "2024-01-01" }),
    ] as never,
    Q3_26,
  );

  assert.deepEqual(
    quarters.map((q) => `${q.year}-Q${q.quarter}`),
    ["2026-Q3", "2026-Q2", "2025-Q4"],
    "newest first, and a lost deal opens no quarter",
  );
});
