// Shared in-memory stand-in for the Supabase client, registered into
// require.cache for "lib/supabase.js" so repository code never touches the
// real Supabase project (or the strict env.ts validation) during tests.
// Only one fake should ever be installed per test run.

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

type Filter = { col: string; op: "eq" | "lt" | "ilike"; val: unknown };

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const rowValue = row[filter.col];

    if (filter.op === "eq") {
      return rowValue === filter.val;
    }

    if (filter.op === "ilike") {
      // No-wildcard ILIKE behaves as case-insensitive equality.
      return (
        String(rowValue).toLowerCase() === String(filter.val).toLowerCase()
      );
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
      data: returnMode === "single" ? (matched[0] ?? null) : matched,
      error: null,
    });

    if (mode === "insert") {
      // Mirror the DB defaults the repositories rely on rather than set:
      // gen_random_uuid() for id, now() for the timestamp columns.
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        stage_entered_at: now,
        ...payload,
      } as Row;
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
    ilike(col: string, val: unknown) {
      filters.push({ col, op: "ilike", val });
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
    // supabase-js query builders are awaitable even without
    // .single()/.maybeSingle() (e.g. a plain list query). Only that bare-chain
    // case expects an array back.
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

function overrideModule(relativePath: string, exports: unknown) {
  const path = require("node:path") as typeof import("node:path");
  const modulePath = path.resolve(__dirname, relativePath);

  require.cache[modulePath] = {
    id: modulePath,
    path: path.dirname(modulePath),
    exports,
    filename: modulePath,
    loaded: true,
    children: [],
    paths: [],
  } as unknown as NodeJS.Module;
}

export function installFakeSupabase() {
  overrideModule("../../../lib/supabase.js", { supabase: fakeSupabase });
}

// Stand in for the validated env module so code that imports `env` directly
// (e.g. external-service providers) loads in tests without real credentials.
export function installFakeEnv(overrides: Record<string, string> = {}) {
  overrideModule("../../../env.js", {
    env: {
      COMPANIES_HOUSE_API_KEY: "test_companies_house_key",
      SUPABASE_URL: "http://localhost",
      SUPABASE_SERVICE_ROLE_KEY: "test_service_role_key",
      AI_PROVIDER_API_KEY: "test_ai_key",
      ...overrides,
    },
  });
}
