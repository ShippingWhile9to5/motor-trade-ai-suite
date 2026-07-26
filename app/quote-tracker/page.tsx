import { requireUser } from "../../lib/auth";
import { listBusinessesWorkflow } from "../../lib/services/businesses";
import { listQuotesWithClientsWorkflow } from "../../lib/services/quotes";
import type { Business } from "../../lib/schemas/business";
import type { QuoteWithClient } from "../../lib/schemas/quote";
import { QuoteBoard } from "./quote-board";

export default async function QuoteTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { userId } = await requireUser();
  // Set by the Prospect Board's "Quote" button, so the firm arrives already
  // picked rather than retyped.
  const { business: preselectBusinessId } = await searchParams;

  let quotes: QuoteWithClient[] = [];
  let businesses: Business[] = [];
  let loadError = false;

  try {
    [quotes, businesses] = await Promise.all([
      listQuotesWithClientsWorkflow(userId ?? ""),
      listBusinessesWorkflow(userId ?? ""),
    ]);
  } catch {
    // Most likely the database isn't configured/migrated yet. Show an empty
    // board with a hint rather than crashing the page.
    loadError = true;
  }

  return (
    <QuoteBoard
      quotes={quotes}
      businesses={businesses}
      preselectBusinessId={preselectBusinessId ?? null}
      loadError={loadError}
    />
  );
}
