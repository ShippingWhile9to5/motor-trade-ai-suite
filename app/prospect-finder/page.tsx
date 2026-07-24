import { requireUser } from "../../lib/auth";
import { ProspectFinderPanel } from "./prospect-finder-panel";

export default async function ProspectFinderPage() {
  await requireUser();

  return <ProspectFinderPanel />;
}
