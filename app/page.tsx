import { requireUser } from "../lib/auth";
import { listBusinessesWorkflow } from "../lib/services/businesses";
import { listQuotesWithClientsWorkflow } from "../lib/services/quotes";
import { listRemindersWorkflow } from "../lib/services/reminders";
import type { Business } from "../lib/schemas/business";
import type { QuoteWithClient } from "../lib/schemas/quote";
import type { Reminder } from "../lib/schemas/reminder";
import { HomePanel } from "./home-panel";

export default async function Home() {
  const { userId } = await requireUser();

  let reminders: Reminder[] = [];
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

  // Loaded separately: until the reminder table is migrated this throws, and
  // that should not take the call-backs and quote chases down with it.
  try {
    reminders = await listRemindersWorkflow(userId ?? "");
  } catch {
    loadError = true;
  }

  return (
    <HomePanel
      reminders={reminders}
      businesses={businesses}
      quotes={quotes}
      loadError={loadError}
    />
  );
}
