import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase } from "./helpers/fake-supabase";

installFakeSupabase();

function load() {
  return require("../../lib/likely-renewal") as typeof import("../../lib/likely-renewal");
}

test("cover is guessed to renew two to three months after incorporation", () => {
  const { likelyRenewalWindow } = load();

  // Set up in March, insured by May or June, renewing then every year.
  const window = likelyRenewalWindow("14/03/2019");

  assert.equal(window?.startMonth, 5);
  assert.equal(window?.endMonth, 6);
  assert.equal(window?.label, "May–Jun");
  assert.equal(window?.incorporatedLabel, "Mar 2019");
});

test("the window wraps round the year end", () => {
  const { likelyRenewalWindow } = load();

  assert.equal(likelyRenewalWindow("01/11/2020")?.label, "Jan–Feb");
  assert.equal(likelyRenewalWindow("01/12/2020")?.label, "Feb–Mar");
  assert.equal(likelyRenewalWindow("01/10/2020")?.label, "Dec–Jan");
});

test("the incorporation date is read as the Finder stores it, or as ISO", () => {
  const { parseIncorporated, likelyRenewalWindow } = load();

  assert.deepEqual(parseIncorporated("14/03/2019"), { year: 2019, month: 3 });
  assert.deepEqual(parseIncorporated("2019-03-14"), { year: 2019, month: 3 });
  // The import from the old tool wrote the long form — most of the board.
  assert.deepEqual(parseIncorporated("22 July 1993"), { year: 1993, month: 7 });
  assert.deepEqual(parseIncorporated("2 July 1957"), { year: 1957, month: 7 });
  // Nothing to go on gives no guess, rather than a wrong one.
  assert.equal(parseIncorporated(null), null);
  assert.equal(parseIncorporated("March 2019"), null);
  assert.equal(likelyRenewalWindow("not a date"), null);
});

test("months until the window count forward, never back to the last one", () => {
  const { likelyRenewalWindow, monthsUntilRenewal } = load();
  const mayJun = likelyRenewalWindow("14/03/2019")!;

  assert.equal(monthsUntilRenewal(mayJun, "2026-03-15"), 2, "two months out");
  assert.equal(monthsUntilRenewal(mayJun, "2026-04-01"), 1, "next month");
  assert.equal(monthsUntilRenewal(mayJun, "2026-05-20"), 0, "inside the window");
  assert.equal(monthsUntilRenewal(mayJun, "2026-06-30"), 0, "still inside");
  // July: the window has just passed. That is the NEXT renewal, ten months
  // off — not something to ring about now.
  assert.equal(monthsUntilRenewal(mayJun, "2026-07-01"), 10);

  // A window across the year end is inside in both its months.
  const decJan = likelyRenewalWindow("01/10/2020")!;

  assert.equal(monthsUntilRenewal(decJan, "2026-12-10"), 0);
  assert.equal(monthsUntilRenewal(decJan, "2027-01-10"), 0);
  assert.equal(monthsUntilRenewal(decJan, "2026-10-10"), 2);
});

test("renewing soon means the window opens within two months", () => {
  const { isRenewingSoon } = load();

  // Incorporated March: renews May–Jun.
  assert.equal(isRenewingSoon("14/03/2019", "2026-02-01"), false, "three months out");
  assert.equal(isRenewingSoon("14/03/2019", "2026-03-01"), true, "two months out");
  assert.equal(isRenewingSoon("14/03/2019", "2026-05-15"), true, "in the window");
  assert.equal(isRenewingSoon("14/03/2019", "2026-08-01"), false, "gone for the year");
  assert.equal(isRenewingSoon(null, "2026-03-01"), false, "nothing to go on");
});

test("the Renewing soon view lists firms worth ringing this month", () => {
  const { filterByView } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  const firm = (over: Record<string, unknown>) =>
    ({
      id: "x",
      name: "Firm",
      pipeline_status: "prospect",
      incorporated: "14/03/2019",
      follow_up: null,
      attempts: 0,
      last_attempt_at: null,
      phone: null,
      mobile: null,
      rating: null,
      ...over,
    }) as never;

  const rows = filterByView(
    [
      firm({ id: "soon", name: "Soon Motors" }),
      firm({ id: "contacted", name: "Spoken To Ltd", pipeline_status: "contacted" }),
      firm({ id: "quoting", name: "Already Quoting", pipeline_status: "quoting" }),
      firm({ id: "won", name: "A Client", pipeline_status: "won" }),
      firm({ id: "later", name: "Later Ltd", incorporated: "14/08/2019" }),
      firm({ id: "unknown", name: "No Date Ltd", incorporated: null }),
    ],
    "renewing",
    "2026-04-01",
  );

  assert.deepEqual(
    rows.map((row: { id: string }) => row.id),
    ["soon", "contacted"],
    "prospects and contacted firms in the window; not one already being quoted, not a client, not one renewing in autumn, not one with no date",
  );
});

test("sorting by likely renewal puts the soonest first and the unknown last", () => {
  const { sortBusinesses } = require(
    "../../lib/prospect-board",
  ) as typeof import("../../lib/prospect-board");

  const firm = (name: string, incorporated: string | null, rating = 3) =>
    ({ id: name, name, incorporated, rating, pipeline_status: "prospect" }) as never;

  const sorted = sortBusinesses(
    [
      firm("Autumn", "14/08/2019"),
      firm("No Date", null),
      firm("Now", "14/02/2019"),
      firm("Next Month", "14/03/2019"),
      firm("Now But Better", "14/02/2019", 5),
    ],
    "renewal",
    "2026-04-15",
  );

  assert.deepEqual(
    sorted.map((row: { name: string }) => row.name),
    ["Now But Better", "Now", "Next Month", "Autumn", "No Date"],
  );
});
