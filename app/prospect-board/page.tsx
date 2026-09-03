import { requireUser } from "../../lib/auth";
import { listBusinessesWorkflow } from "../../lib/services/businesses";
import { listQuotesWithClientsWorkflow } from "../../lib/services/quotes";
import type { Business } from "../../lib/schemas/business";
import type { QuoteWithClient } from "../../lib/schemas/quote";
import { ProspectBoardPanel } from "./prospect-board-panel";

export default async function ProspectBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { userId } = await requireUser();
  // Set by Today's Open button, so a row you clicked on opens on the firm it
  // was about rather than dropping you at the top of the board to hunt.
  const { business: focusBusinessId } = await searchParams;

  let businesses: Business[] = [];
  let quotes: QuoteWithClient[] = [];
  let loadError = false;

  try {
    [businesses, quotes] = await Promise.all([
      listBusinessesWorkflow(userId ?? ""),
      listQuotesWithClientsWorkflow(userId ?? ""),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <ProspectBoardPanel
      businesses={businesses}
      quotes={quotes}
      focusBusinessId={focusBusinessId ?? null}
      loadError={loadError}
    />
  );
}
