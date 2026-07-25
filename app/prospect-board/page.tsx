import { requireUser } from "../../lib/auth";
import { listBusinessesWorkflow } from "../../lib/services/businesses";
import type { Business } from "../../lib/schemas/business";
import { ProspectBoardPanel } from "./prospect-board-panel";

export default async function ProspectBoardPage() {
  const { userId } = await requireUser();

  let businesses: Business[] = [];
  let loadError = false;

  try {
    businesses = await listBusinessesWorkflow(userId ?? "");
  } catch {
    loadError = true;
  }

  return <ProspectBoardPanel businesses={businesses} loadError={loadError} />;
}
