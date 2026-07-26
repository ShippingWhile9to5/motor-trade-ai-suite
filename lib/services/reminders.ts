import "server-only";

import {
  type Reminder,
  createReminderInputSchema,
  deleteReminderInputSchema,
  updateReminderInputSchema,
} from "../schemas/reminder";
import {
  deleteReminder,
  insertReminder,
  listReminders,
  updateReminderRow,
} from "../repositories/reminders";

export async function listRemindersWorkflow(
  userId: string,
): Promise<Reminder[]> {
  return listReminders(userId);
}

export async function createReminderWorkflow(
  userId: string,
  input: unknown,
): Promise<Reminder> {
  const data = createReminderInputSchema.parse(input);

  return insertReminder(userId, {
    body: data.body,
    due_date: data.due_date,
    business_id: data.business_id,
  });
}

export async function updateReminderWorkflow(
  userId: string,
  input: unknown,
): Promise<Reminder | null> {
  const { id, ...parsed } = updateReminderInputSchema.parse(input);

  const changes = Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(changes).length === 0) {
    return null;
  }

  return updateReminderRow(userId, id, changes);
}

export async function deleteReminderWorkflow(
  userId: string,
  input: unknown,
): Promise<void> {
  const { id } = deleteReminderInputSchema.parse(input);

  await deleteReminder(userId, id);
}
