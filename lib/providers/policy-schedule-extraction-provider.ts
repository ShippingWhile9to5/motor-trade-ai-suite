import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../env";
import {
  extractedPolicyDataSchema,
  type ExtractedPolicyData,
} from "../schemas/policy-letter";

const EXTRACTION_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are an expert at reading UK motor trade insurance policy schedules and extracting the information a broker needs to write a client letter and enter risk notes into Acturis.

Return ONLY a JSON object, no markdown fences, no commentary, matching exactly this shape:

{
  "excesses": [
    { "category": "string, e.g. 'Accidental Damage', 'Fire & Theft', 'Windscreen'", "amount": "string, e.g. '£500', '£250 each and every claim'", "description": "string, optional" }
  ],
  "exclusions": ["string - each significant exclusion. If a reference code is shown, keep it in the format 'CODE - Description', e.g. 'HE011 - Waste Oil Heater Exclusion'"],
  "endorsements": ["string - each endorsement or special condition, same 'CODE - Description' format when a code is present, e.g. 'PY024 - Revised Vehicle Excesses'"],
  "conditions": ["string - each important condition, same 'CODE - Description' format when a code is present"],
  "driverBasis": "string, e.g. 'Any Employee for Business use, Named for SDP'",
  "businessDescription": "string - the insured's business type as stated in the schedule",
  "coverIncluded": ["string - each type of cover included"],
  "coverNotIncluded": ["string - each type of cover explicitly excluded or not included"]
}

Guidelines:
- Extract ALL excesses with their specific amounts and categories - excesses often differ between material damage and road risks sections, keep them separate.
- List every significant exclusion - do not skip standard boilerplate exclusions, but prioritise completeness over brevity.
- Include every endorsement and condition, always preserving the reference code when the document shows one.
- Be precise with amounts and codes - a broker will copy these directly into a client letter and their broker management system.
- If a field has no matching information, use an empty array [] or empty string "".`;

const USER_PROMPT =
  "Extract the endorsements, conditions, exclusions, excesses, driver basis, business description, and cover included/not included from this policy schedule.";

function toDocumentBlock(base64: string): Anthropic.Messages.DocumentBlockParam {
  return {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: base64,
    },
  };
}

function parseJsonObject(text: string): unknown {
  let candidate = text.trim();

  if (candidate.startsWith("```")) {
    candidate = candidate.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Extraction response did not contain a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

const client = new Anthropic({ apiKey: env.AI_PROVIDER_API_KEY });

export async function extractPolicyScheduleData(
  pdfBase64: string,
): Promise<ExtractedPolicyData> {
  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: [toDocumentBlock(pdfBase64), { type: "text", text: USER_PROMPT }],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from the extraction model.");
  }

  const parsed = parseJsonObject(textBlock.text);

  return extractedPolicyDataSchema.parse(parsed);
}
