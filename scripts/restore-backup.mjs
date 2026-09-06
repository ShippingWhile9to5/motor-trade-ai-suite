// Puts an export back into a database — and, just as importantly, is how you
// find out whether the export was ever any good. An untested backup is a
// folder of files you hope will work.
//
// Reports what it would do, and changes nothing, unless --write is given:
//
//   npm run restore                    # newest backup, dry run
//   npm run restore -- --write         # actually insert
//   npm run restore -- backups/2026-09-06T08-58-05
//
// Writing needs SUPABASE_RESTORE_URL and SUPABASE_RESTORE_SERVICE_ROLE_KEY —
// deliberately different names from the live ones, so a restore cannot reach
// the live database by simply being run in the wrong folder.

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Parents before children: a quote refers to a business, and a reminder may
// refer to one too, so the order here is the foreign keys' order.
const TABLES = ["business", "quote", "reminder"];
const BATCH_SIZE = 500;

async function newestBackup() {
  const dir = path.join(process.cwd(), "backups");
  const entries = await readdir(dir).catch(() => []);
  const stamps = entries.filter((name) => !name.startsWith(".")).sort();

  if (stamps.length === 0) {
    throw new Error("No backups found. Run `npm run backup` first.");
  }

  return path.join(dir, stamps[stamps.length - 1]);
}

async function readTable(dir, table) {
  const raw = await readFile(path.join(dir, `${table}.json`), "utf8").catch(
    () => null,
  );

  if (raw === null) {
    throw new Error(`${table}.json is missing from that backup.`);
  }

  return JSON.parse(raw);
}

function targetClient() {
  const url = process.env.SUPABASE_RESTORE_URL;
  const key = process.env.SUPABASE_RESTORE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_RESTORE_URL and SUPABASE_RESTORE_SERVICE_ROLE_KEY to the project you are restoring INTO.",
    );
  }

  // The guard that matters. Restoring over the live database would overwrite
  // the very thing the backup exists to protect.
  if (process.env.SUPABASE_URL && url === process.env.SUPABASE_URL) {
    throw new Error(
      "SUPABASE_RESTORE_URL is the live database. Point it at the rehearsal project instead.",
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const force = args.includes("--force");
  const dir = args.find((arg) => !arg.startsWith("--")) ?? (await newestBackup());

  console.log(`Backup:  ${path.relative(process.cwd(), dir) || dir}`);

  const tables = {};

  for (const table of TABLES) {
    tables[table] = await readTable(dir, table);
    console.log(`  ${table.padEnd(10)} ${tables[table].length} rows`);
  }

  if (!write) {
    console.log("\nDry run — nothing written. Add --write to restore.");

    return;
  }

  const supabase = targetClient();

  // A restore into a database that already holds rows is how one book ends up
  // merged into another. It has to be asked for explicitly.
  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (count > 0 && !force) {
      throw new Error(
        `${table} already holds ${count} rows. Empty it first, or pass --force.`,
      );
    }
  }

  for (const table of TABLES) {
    const rows = tables[table];

    for (let from = 0; from < rows.length; from += BATCH_SIZE) {
      const batch = rows.slice(from, from + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(batch);

      if (error) {
        throw new Error(`${table}: ${error.message}`);
      }
    }

    // Counted back out of the database rather than trusting the insert, which
    // is the whole point of the exercise.
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    const ok = count === rows.length ? "ok" : "MISMATCH";

    console.log(`  ${table.padEnd(10)} ${count}/${rows.length} ${ok}`);
  }

  console.log("\nRestored.");
}

main().catch((error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exit(1);
});
