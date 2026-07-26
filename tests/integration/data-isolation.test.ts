// Structural guards on the thing that keeps one broker's pipeline out of
// another's: every row carries a user_id, and every query filters on it.
//
// The service-role key bypasses Supabase's row-level security, so that filter
// is currently the only wall. These tests fail the build if a new query is
// added without one, or if database access leaks outside the repository layer
// — neither of which anyone has to remember, because they just go red.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(__dirname, "../../..");
const REPOSITORIES = path.join(ROOT, "lib/repositories");

function readRepositoryFiles(): { name: string; source: string }[] {
  return fs
    .readdirSync(REPOSITORIES)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => ({
      name,
      source: fs.readFileSync(path.join(REPOSITORIES, name), "utf8"),
    }));
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".")
        ? []
        : walk(full);
    }

    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [full]
      : [];
  });
}

test("every repository query is scoped to a user", () => {
  const files = readRepositoryFiles();

  assert.ok(files.length > 0, "no repository files found — has the path moved?");

  let checked = 0;

  for (const { name, source } of files) {
    // Each `.from("table")` starts a query chain that runs to the next
    // semicolon. Somewhere in that chain, user_id has to appear: as a filter
    // for reads, updates and deletes, or in the payload for an insert.
    const chains = source.split(".from(").slice(1);

    for (const chain of chains) {
      const end = chain.indexOf(";");
      const statement = end === -1 ? chain : chain.slice(0, end);
      const table = chain.slice(0, chain.indexOf(")"));

      assert.ok(
        statement.includes("user_id"),
        `${name}: query on ${table} is not scoped by user_id — it would return every user's rows`,
      );

      checked += 1;
    }
  }

  assert.ok(checked > 0, "found no queries to check");
});

test("only the repository layer touches the database client", () => {
  const offenders: string[] = [];

  for (const dir of ["lib", "app"]) {
    for (const file of walk(path.join(ROOT, dir))) {
      const relative = path.relative(ROOT, file);

      if (relative.startsWith(path.join("lib", "repositories"))) {
        continue;
      }

      const source = fs.readFileSync(file, "utf8");

      // The Supabase client is only ever imported as `supabase` from the
      // shared module. Anywhere else means a query that skipped the layer
      // where the user_id filter lives.
      if (/from\s+["'][^"']*\/supabase["']/.test(source)) {
        offenders.push(relative);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "database access outside lib/repositories bypasses the user_id filter",
  );
});

test("every repository function takes the user it is acting for", () => {
  for (const { name, source } of readRepositoryFiles()) {
    // `[^)]*` already spans newlines, so no dotAll flag is needed.
    const exported = source.matchAll(/export async function (\w+)\(([^)]*)\)/g);

    for (const [, fnName, params] of exported) {
      assert.match(
        params.trim(),
        /^userId: string/,
        `${name}: ${fnName}() must take userId first, so a caller cannot omit it`,
      );
    }
  }
});
