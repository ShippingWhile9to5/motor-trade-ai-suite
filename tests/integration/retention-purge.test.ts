import assert from "node:assert/strict";
import test from "node:test";
import { installFakeSupabase, store } from "./helpers/fake-supabase";

installFakeSupabase();

test("retention purge deletes only cases older than the window", async () => {
  const { purgeExpiredCasesWorkflow } = require(
    "../../lib/services/cases",
  ) as typeof import("../../lib/services/cases");

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  store.cases = [
    { id: crypto.randomUUID(), updated_at: new Date(now - 40 * dayMs).toISOString() },
    { id: crypto.randomUUID(), updated_at: new Date(now - 31 * dayMs).toISOString() },
    { id: crypto.randomUUID(), updated_at: new Date(now - 5 * dayMs).toISOString() },
  ];

  const result = await purgeExpiredCasesWorkflow({ retention_days: 30 });

  assert.equal(result.deleted_count, 2);
  assert.equal(result.retention_days, 30);
  assert.equal(store.cases.length, 1);
});
