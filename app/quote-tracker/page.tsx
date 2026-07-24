import { requireUser } from "../../lib/auth";
import { listQuotesWithClientsWorkflow } from "../../lib/services/quotes";
import type { QuoteWithClient } from "../../lib/schemas/quote";
import { QuoteBoard } from "./quote-board";

export default async function QuoteTrackerPage() {
  const { userId } = await requireUser();

  let quotes: QuoteWithClient[] = [];
  let loadError = false;

  try {
    quotes = await listQuotesWithClientsWorkflow(userId ?? "");
  } catch {
    // Most likely the database isn't configured/migrated yet. Show an empty
    // board with a hint rather than crashing the page.
    loadError = true;
  }

  return <QuoteBoard quotes={quotes} loadError={loadError} />;
}
