import { requireUser } from "../../lib/auth";
import { listBusinessesWorkflow } from "../../lib/services/businesses";
import { listQuotesWithClientsWorkflow } from "../../lib/services/quotes";
import type { Business } from "../../lib/schemas/business";
import type { QuoteWithClient } from "../../lib/schemas/quote";
import { ProspectBoardPanel } from "./prospect-board-panel";

export default async function ProspectBoardPage() {
  const { userId } = await requireUser();

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
      loadError={loadError}
    />
  );
}
