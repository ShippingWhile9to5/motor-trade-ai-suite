import "server-only";

import { env } from "../../env";
import type { ExtractionProvider } from "./extraction";
import { anthropicFactFindProvider } from "./anthropic-fact-find-provider";
import { factFindProvider as placeholderProvider } from "./fact-find-provider";

/**
 * Uses the real Claude extraction provider when a genuine API key is
 * configured, and falls back to the empty-placeholder provider otherwise
 * (e.g. local dev with the dummy key), so the workflow still runs end to end.
 */
export function getExtractionProvider(): ExtractionProvider {
  const key = env.AI_PROVIDER_API_KEY;
  const isPlaceholderKey = !key || key.toLowerCase().startsWith("dummy");

  return isPlaceholderKey ? placeholderProvider : anthropicFactFindProvider;
}
