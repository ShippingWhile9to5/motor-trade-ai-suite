import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

type ExtractionRow = Record<string, unknown>;
type DocumentRow = Record<string, unknown>;

const extractionRows: ExtractionRow[] = [];
const documentRows: DocumentRow[] = [];

function createFakeSupabase() {
  return {
    from(tableName: string) {
      assert.ok(["documents", "extractions"].includes(tableName));

      const rows = tableName === "documents" ? documentRows : extractionRows;
      const filters: Array<{ column: string; value: unknown }> = [];
      let insertData: DocumentRow | ExtractionRow | null = null;
      let updateData: DocumentRow | ExtractionRow | null = null;

      const matchingRows = () =>
        rows.filter((row) =>
          filters.every((filter) => row[filter.column] === filter.value),
        );

      const builder = {
        insert(data: ExtractionRow) {
          insertData = data;
          return builder;
        },
        update(data: ExtractionRow) {
          updateData = data;
          return builder;
        },
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push({ column, value });
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        async single() {
          if (insertData) {
            const now = new Date().toISOString();
            const row = {
              id: crypto.randomUUID(),
              ...insertData,
              created_at: now,
              ...(tableName === "extractions" ? { updated_at: now } : {}),
            };

            rows.push(row);

            return { data: row, error: null };
          }

          return { data: matchingRows()[0] ?? null, error: null };
        },
        async maybeSingle() {
          if (updateData) {
            const row = matchingRows()[0];

            if (!row) {
              return { data: null, error: null };
            }

            Object.assign(row, updateData, {
              updated_at: new Date().toISOString(),
            });

            return { data: row, error: null };
          }

          return { data: matchingRows()[0] ?? null, error: null };
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

test("placeholder extraction pipeline runs through persistence", async () => {
  const { createDocumentReferenceWorkflow } = require(
    "../../lib/services/storage",
  ) as typeof import("../../lib/services/storage");
  const { getDocumentReferenceWorkflow } = require(
    "../../lib/services/storage",
  ) as typeof import("../../lib/services/storage");
  const { executeExtractionWorkflow } = require(
    "../../lib/services/extraction-execution",
  ) as typeof import(
    "../../lib/services/extraction-execution"
  );
  const { getExtractionByCaseIdWorkflow } = require(
    "../../lib/services/extractions",
  ) as typeof import(
    "../../lib/services/extractions"
  );
  const { factFindProvider } = require(
    "../../lib/providers/fact-find-provider",
  ) as typeof import(
    "../../lib/providers/fact-find-provider"
  );

  const caseId = crypto.randomUUID();
  const userId = "user_test_123";
  const documentReference = await createDocumentReferenceWorkflow({
    case_id: caseId,
    user_id: userId,
    file_name: "fact-find.pdf",
    file_type: "application/pdf",
    file_size: 1024,
    storage_path: `cases/${caseId}/fact-find.pdf`,
  });
  assert.equal(documentRows.length, 1);
  assert.equal(documentRows[0].id, documentReference.id);
  assert.deepEqual(
    documentRows.filter((row) => row.id === documentReference.id),
    [documentRows[0]],
  );
  assert.deepEqual(
    await getDocumentReferenceWorkflow({ id: documentReference.id }),
    documentReference,
  );

  const result = await executeExtractionWorkflow(
    {
      document_reference_id: documentReference.id,
      user_id: userId,
    },
    factFindProvider,
  );

  if (!result.success) {
    throw new Error(
      `Expected extraction execution to succeed: ${JSON.stringify(result)}`,
    );
  }

  assert.equal(result.extraction.case_id, caseId);
  assert.equal(result.extraction.document_id, documentReference.id);
  assert.equal(result.extraction.user_id, userId);
  assert.equal(result.extraction.status, "review_required");
  assert.equal(
    result.extraction.raw_result_json?.business_details.client_name.value,
    "",
  );
  assert.equal(
    result.extraction.raw_result_json?.business_details.client_name
      .requires_review,
    true,
  );
  assert.equal(
    result.extraction.raw_result_json?.business_details.client_name
      .is_missing_required,
    true,
  );
  assert.ok(
    result.missing_required_fields.some(
      (group) => group.section === "business_details",
    ),
  );

  const persisted = await getExtractionByCaseIdWorkflow({
    case_id: caseId,
    user_id: userId,
  });

  assert.deepEqual(persisted, result.extraction);
  assert.equal(extractionRows.length, 1);
});
