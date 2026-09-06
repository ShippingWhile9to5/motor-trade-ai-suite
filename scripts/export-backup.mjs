// Exports every row of the CRM to timestamped JSON.
//
// The Supabase free plan takes no automatic backups, so on that plan the live
// database is the only copy of the book. This is the off-site copy Supabase's
// own guidance tells free-tier projects to keep, and the thing to run before
// any migration that touches live data.
//
//   npm run backup
//
// Output lands in backups/, which is gitignored — these files hold client
// data and must never reach the repository.

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Every table the CRM owns. A table missing here is a table not backed up,
// so this list has to grow when the schema does.
const TABLES = ["business", "quote", "reminder"];

// Supabase caps a single select at 1000 rows, so a bigger table has to be
// walked a page at a time or the export silently stops short.
const PAGE_SIZE = 1000;

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is missing. Run this with: node --env-file=.env.local scripts/export-backup.mjs`,
    );
  }

  return value;
}

async function fetchAll(supabase, table) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

async function main() {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(process.cwd(), "backups", stamp);

  await mkdir(dir, { recursive: true });

  const counts = {};

  for (const table of TABLES) {
    const rows = await fetchAll(supabase, table);

    await writeFile(
      path.join(dir, `${table}.json`),
      `${JSON.stringify(rows, null, 2)}\n`,
    );

    counts[table] = rows.length;
    console.log(`${table.padEnd(10)} ${rows.length} rows`);
  }

  // Counts are written alongside the data so a later restore can be checked
  // against what was actually taken, rather than against memory.
  await writeFile(
    path.join(dir, "manifest.json"),
    `${JSON.stringify({ takenAt: new Date().toISOString(), counts }, null, 2)}\n`,
  );

  console.log(`\nWritten to backups/${stamp}`);
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exit(1);
});
