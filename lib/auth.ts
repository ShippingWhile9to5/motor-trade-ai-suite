import "server-only";

import { auth } from "@clerk/nextjs/server";

export async function requireUser() {
  return auth.protect();
}
