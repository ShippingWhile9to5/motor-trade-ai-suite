// Shared in-memory stand-in for the Supabase client, registered into
// require.cache for "lib/supabase.js" so repository code never touches the
// real Supabase project (or the strict env.ts validation) during tests.
// Only one fake should ever be installed per test run — multiple test files
// overwriting the same require.cache entry with different, incompatible
// fakes would race depending on file load order.

export type Row = Record<string, unknown>;

export const store: Record<string, Row[]> = {};

export function resetStore(table?: string) {
  if (table) {
    store[table] = [];
    return;
  }

  for (const key of Object.keys(store)) {
    store[key] = [];
  }
}

function ensureTable(table: string): Row[] {
  if (!store[table]) {
    store[table] = [];
  }

  return store[table];
}

type Filter = { col: string; op: "eq" | "lt"; val: unknown };

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const rowValue = row[filter.col];

    if (filter.op === "eq") {
      return rowValue === filter.val;
    }

    return (rowValue as string | number) < (filter.val as string | number);
  });
}

function createQuery(table: string) {
  const filters: Filter[] = [];
  let mode: "select" | "insert" | "update" | "delete" = "select";
  let payload: Row | null = null;

  function execute(returnMode: "array" | "single"): {
    data: unknown;
    error: null;
  } {
    const rows = ensureTable(table);
    const asReturn = (matched: Row[]) => ({
      data: returnMode === "single" ? matched[0] ?? null : matched,
      error: null,
    });

    if (mode === "insert") {
      // Mirror `default now()` on created_at/updated_at columns present in
      // every real table — the repositories never set these explicitly.
      const now = new Date().toISOString();
      const row = { created_at: now, updated_at: now, ...payload } as Row;
      rows.push(row);
      return asReturn([row]);
    }

    if (mode === "update") {
      const matched = rows.filter((row) => matchesFilters(row, filters));
      matched.forEach((row) => Object.assign(row, payload));
      return asReturn(matched);
    }

    if (mode === "delete") {
      const matched = rows.filter((row) => matchesFilters(row, filters));
      store[table] = rows.filter((row) => !matchesFilters(row, filters));
      return asReturn(matched);
    }

    const matched = filters.length
      ? rows.filter((row) => matchesFilters(row, filters))
      : rows;

    return asReturn(matched);
  }

  const builder = {
    select(_columns?: string) {
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push({ col, op: "eq", val });
      return builder;
    },
    lt(col: string, val: unknown) {
      filters.push({ col, op: "lt", val });
      return builder;
    },
    insert(row: Row) {
      mode = "insert";
      payload = row;
      return builder;
    },
    update(row: Row) {
      mode = "update";
      payload = row;
      return builder;
    },
    delete() {
      mode = "delete";
      return builder;
    },
    async single() {
      return execute("single");
    },
    async maybeSingle() {
      return execute("single");
    },
    // supabase-js query builders are directly awaitable even without
    // .single()/.maybeSingle() (e.g. delete().lt(...).select()) — mirror
    // that by making the builder thenable. Only this bare-chain case
    // expects an array back.
    then(
      resolve: (value: { data: unknown; error: null }) => void,
      reject?: (reason: unknown) => void,
    ) {
      try {
        resolve(execute("array"));
      } catch (err) {
        reject?.(err);
      }
    },
  };

  return builder;
}

export const fakeSupabase = {
  from(table: string) {
    return createQuery(table);
  },
};

export function installFakeSupabase() {
  const path = require("node:path") as typeof import("node:path");
  const supabaseModulePath = path.resolve(
    __dirname,
    "../../../lib/supabase.js",
  );

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    path: path.dirname(supabaseModulePath),
    exports: { supabase: fakeSupabase },
    filename: supabaseModulePath,
    loaded: true,
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;
}
