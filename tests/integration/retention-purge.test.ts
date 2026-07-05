import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

type CaseRow = { id: string; updated_at: string };

const caseRows: CaseRow[] = [];

function createFakeSupabase() {
  return {
    from(tableName: string) {
      assert.equal(tableName, "cases");

      let cutoff: string | null = null;

      const builder = {
        delete() {
          return builder;
        },
        lt(column: string, value: string) {
          assert.equal(column, "updated_at");
          cutoff = value;
          return builder;
        },
        select() {
          const deleted = caseRows.filter(
            (row) => cutoff !== null && row.updated_at < cutoff,
          );

          for (const row of deleted) {
            caseRows.splice(caseRows.indexOf(row), 1);
          }

          return Promise.resolve({
            data: deleted.map((row) => ({ id: row.id })),
            error: null,
          });
        },
      };

      return builder;
    },
  };
}

const supabaseModulePath = path.resolve(__dirname, "../../lib/supabase.js");
require.cache[supabaseModulePath] = {
  id: supabaseModulePath,
  path: path.dirname(supabaseModulePath),
  exports: { supabase: createFakeSupabase() },
  filename: supabaseModulePath,
  loaded: true,
  children: [],
  paths: [],
} as unknown as NodeJS.Module;

test("retention purge deletes only cases older than the window", async () => {
  const { purgeExpiredCasesWorkflow } = require(
    "../../lib/services/cases",
  ) as typeof import("../../lib/services/cases");

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  caseRows.push(
    { id: crypto.randomUUID(), updated_at: new Date(now - 40 * dayMs).toISOString() },
    { id: crypto.randomUUID(), updated_at: new Date(now - 31 * dayMs).toISOString() },
    { id: crypto.randomUUID(), updated_at: new Date(now - 5 * dayMs).toISOString() },
  );

  const result = await purgeExpiredCasesWorkflow({ retention_days: 30 });

  assert.equal(result.deleted_count, 2);
  assert.equal(result.retention_days, 30);
  assert.equal(caseRows.length, 1);
});
