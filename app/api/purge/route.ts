import { NextResponse } from "next/server";
import { purgeExpiredCasesWorkflow } from "../../../lib/services/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RETENTION_DAYS = 30;

function resolveRetentionDays() {
  const raw = Number(process.env.CASE_RETENTION_DAYS);

  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }

  return DEFAULT_RETENTION_DAYS;
}

/**
 * Scheduled retention purge. Vercel Cron invokes this with
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the
 * project env. Disabled (503) until that secret is configured.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Retention purge is not configured (CRON_SECRET unset)." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await purgeExpiredCasesWorkflow({
      retention_days: resolveRetentionDays(),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Purge failed.";

    return NextResponse.json(
      {
        ok: false,
        error: process.env.NODE_ENV === "production" ? "Purge failed." : message,
      },
      { status: 500 },
    );
  }
}
