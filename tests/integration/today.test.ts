import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase, resetStore, store } from "./helpers/fake-supabase";

installFakeSupabase();

const USER = "user_test_today";
const TODAY = "2026-07-26";

const business = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  user_id: USER,
  name: "Brookway Cars Ltd",
  company_number: null,
  company_status: null,
  incorporated: null,
  location: null,
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
  rating: 3,
  pipeline_status: "prospect",
  follow_up: null,
  notes: null,
  source: "manual",
  created_at: "",
  updated_at: "",
  ...over,
});

const quote = (over: Record<string, unknown> = {}) => ({
  id: "q1",
  user_id: USER,
  business_id: "b1",
  client_name: "Brookway Cars Ltd",
  insurer: "Covea",
  quote_type: "New Business",
  submission_date: "2026-07-01",
  stage: 4,
  notes: null,
  target_premium: null,
  last_year_premium: null,
  quoted_premium: null,
  initial_quoted_premium: null,
  commission: null,
  outcome: null,
  closed_at: null,
  stage_entered_at: new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString(),
  created_at: "",
  updated_at: "",
  ...over,
});

const reminder = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  user_id: USER,
  business_id: null,
  body: "Call Fraser back",
  due_date: TODAY,
  done: false,
  created_at: "",
  updated_at: "",
  ...over,
});

test("today gathers reminders, call-backs and quotes that need chasing", () => {
  const { buildTodayList } = require(
    "../../lib/today",
  ) as typeof import("../../lib/today");

  const items = buildTodayList(
    {
      reminders: [reminder()] as never,
      businesses: [
        business({ id: "b1", follow_up: "2026-07-20" }),
        business({ id: "b2", name: "Later Ltd", follow_up: "2026-08-30" }),
      ] as never,
      quotes: [quote()] as never,
    },
    TODAY,
  );

  assert.deepEqual(
    items.map((item) => item.kind),
    ["follow-up", "quote", "reminder"],
    "overdue items sort ahead of what is merely due",
  );
  assert.equal(
    items.some((item) => item.title === "Later Ltd"),
    false,
    "a future call-back is not today's problem",
  );
});

test("a loose reminder with no firm attached still shows", () => {
  const { buildTodayList } = require(
    "../../lib/today",
  ) as typeof import("../../lib/today");

  const items = buildTodayList(
    {
      reminders: [reminder({ business_id: null })] as never,
      businesses: [],
      quotes: [],
    },
    TODAY,
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].detail, "Note to self");
  assert.equal(items[0].businessId, null);
});

test("done reminders and closed firms drop off", () => {
  const { buildTodayList } = require(
    "../../lib/today",
  ) as typeof import("../../lib/today");

  const items = buildTodayList(
    {
      reminders: [reminder({ done: true })] as never,
      businesses: [
        business({ id: "b9", follow_up: "2026-01-01", pipeline_status: "won" }),
        business({ id: "b8", follow_up: "2026-01-01", pipeline_status: "lost" }),
      ] as never,
      quotes: [quote({ outcome: "Won" })] as never,
    },
    TODAY,
  );

  assert.deepEqual(items, [], "nothing closed should ask for attention");
});

test("a reminder linked to a firm shows the firm's name", () => {
  const { buildTodayList } = require(
    "../../lib/today",
  ) as typeof import("../../lib/today");

  const items = buildTodayList(
    {
      reminders: [reminder({ business_id: "b1" })] as never,
      businesses: [business({ id: "b1", name: "Brookway Cars Ltd" })] as never,
      quotes: [],
    },
    TODAY,
  );

  assert.equal(items[0].detail, "Brookway Cars Ltd");
});

test("top five puts quoted deals above ones you have only contacted", () => {
  const { pickTopProspects } = require(
    "../../lib/top-five",
  ) as typeof import("../../lib/top-five");

  const top = pickTopProspects(
    [
      business({ id: "b1", name: "Only Contacted", pipeline_status: "contacted", rating: 5 }),
      business({ id: "b2", name: "Quoted Firm", pipeline_status: "quoting", rating: 3 }),
      business({ id: "b3", name: "Cold Firm", pipeline_status: "prospect", rating: 5 }),
      business({ id: "b4", name: "Won Firm", pipeline_status: "won", rating: 5 }),
    ] as never,
    [quote({ business_id: "b2", quoted_premium: 5800, stage: 4 })] as never,
  );

  assert.deepEqual(
    top.map((row) => row.name),
    ["Quoted Firm", "Only Contacted", "Cold Firm"],
    "won firms are not prospects",
  );
  assert.equal(top[0].premium, 5800);
  assert.equal(top[0].stageLabel, "Sent to Client");
});

test("the meeting list is plain text with the business and the premium", () => {
  const { formatTopProspects, pickTopProspects } = require(
    "../../lib/top-five",
  ) as typeof import("../../lib/top-five");

  const text = formatTopProspects(
    pickTopProspects(
      [business({ id: "b2", name: "Quoted Firm", pipeline_status: "quoting" })] as never,
      [quote({ business_id: "b2", quoted_premium: 5800, stage: 4 })] as never,
    ),
    TODAY,
  );

  assert.ok(text.startsWith("Top 1 prospects — 26 July 2026"));
  assert.ok(text.includes("1. Quoted Firm — Quoted"));
  assert.ok(text.includes("£5,800"));
  assert.ok(text.includes("Covea"));
});

test("only the furthest-along live quote counts for a firm", () => {
  const { pickTopProspects } = require(
    "../../lib/top-five",
  ) as typeof import("../../lib/top-five");

  const top = pickTopProspects(
    [business({ id: "b2", name: "Two Quotes", pipeline_status: "quoting" })] as never,
    [
      quote({ id: "qa", business_id: "b2", stage: 2, quoted_premium: 1000 }),
      quote({ id: "qb", business_id: "b2", stage: 5, quoted_premium: 4000 }),
      quote({ id: "qc", business_id: "b2", stage: 6, quoted_premium: 9999, outcome: "Lost" }),
    ] as never,
  );

  assert.equal(top.length, 1);
  assert.equal(top[0].premium, 4000, "a closed quote is not the live one");
});

test("reminders round-trip and are scoped to their owner", async () => {
  resetStore();
  const {
    createReminderWorkflow,
    listRemindersWorkflow,
    updateReminderWorkflow,
    deleteReminderWorkflow,
  } = require(
    "../../lib/services/reminders",
  ) as typeof import("../../lib/services/reminders");

  const created = await createReminderWorkflow(USER, {
    body: "  Call Fraser back  ",
    due_date: "2026-07-27",
    business_id: "",
  });

  assert.equal(created.body, "Call Fraser back");
  assert.equal(created.business_id, null, "an unlinked reminder stores null");
  assert.equal(created.done, false);

  const done = await updateReminderWorkflow(USER, {
    id: created.id,
    done: true,
  });
  assert.equal(done?.done, true);

  const otherUser = await updateReminderWorkflow("someone_else", {
    id: created.id,
    done: false,
  });
  assert.equal(otherUser, null, "another user cannot touch it");

  await deleteReminderWorkflow("someone_else", { id: created.id });
  assert.equal(store.reminder.length, 1, "nor delete it");

  assert.equal((await listRemindersWorkflow(USER)).length, 1);

  await deleteReminderWorkflow(USER, { id: created.id });
  assert.equal(store.reminder.length, 0);
});

test("a reminder needs a real date and some words", async () => {
  const { createReminderWorkflow } = require(
    "../../lib/services/reminders",
  ) as typeof import("../../lib/services/reminders");

  await assert.rejects(
    () => createReminderWorkflow(USER, { body: "", due_date: "2026-07-27" }),
    /What is the reminder/,
  );
  await assert.rejects(
    () => createReminderWorkflow(USER, { body: "Call back", due_date: "Monday" }),
    /needs a date/,
  );
});
