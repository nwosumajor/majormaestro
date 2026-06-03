import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import {
  buildProfileBlock,
  buildAllowedListBlock,
  type AllowedPosition,
  type ClassificationInput,
} from "@/lib/classificationSchema";

const MODEL = "claude-sonnet-4-6";

/**
 * Shared Anthropic classify call used by BOTH flows:
 *   - /api/classify (fixed enum, ClassificationSchema, length-3 + skillGaps)
 *   - the bulk processor (dynamic allowed-list, parallel schema)
 *
 * The prompt scaffolding (profile block + allowed-list block + the model call)
 * lives here so prompt logic is never duplicated. Each flow supplies its own
 * Zod output schema + tail instructions — the two output shapes are
 * intentionally different.
 */
export async function runClassification<T>(args: {
  input: ClassificationInput;
  allowed: AllowedPosition[];
  schema: z.ZodSchema<T>;
  instructions: string;
}): Promise<T> {
  const prompt = `You are an expert HR strategist and organisational psychologist. Evaluate the staff profile below and recommend the best-fit internal departments.

${buildProfileBlock(args.input)}

ALLOWED DEPARTMENTS (you MUST choose departmentName and industryCategory exactly as written below):
${buildAllowedListBlock(args.allowed)}

INSTRUCTIONS:
${args.instructions}`;

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: args.schema,
    prompt,
  });
  return object;
}

// ─── Dynamic schema for the bulk flow ──────────────────────────────────────
// departmentName is hard-constrained to the HR-selected positions via z.enum,
// so the model cannot invent a department outside the chosen allowed-list.

export interface DynamicResultItem {
  rank: number;
  departmentName: string;
  industryCategory: string;
  confidence: number;
  reasoning: string;
}

export function buildDynamicResultSchema(allowed: AllowedPosition[]) {
  const names = [...new Set(allowed.map((p) => p.departmentName))];
  // z.enum needs a non-empty tuple; fall back to z.string() if (defensively) empty.
  const departmentName =
    names.length > 0 ? z.enum(names as [string, ...string[]]) : z.string();

  return z.object({
    results: z
      .array(
        z.object({
          rank: z.number().int().min(1),
          departmentName,
          industryCategory: z.string(),
          confidence: z.number().min(0).max(100),
          reasoning: z.string(),
        })
      )
      .min(1),
  });
}

/**
 * Map an AI department choice back to the concrete catalog position id +
 * canonical industry. Defends against the model pairing a valid department
 * with the wrong industry label.
 */
export function resolvePositionId(
  allowed: AllowedPosition[],
  departmentName: string
): { positionId: string | null; industryCategory: string } | null {
  const match = allowed.find((p) => p.departmentName === departmentName);
  if (!match) return null;
  return { positionId: match.positionId ?? null, industryCategory: match.industryCategory };
}
