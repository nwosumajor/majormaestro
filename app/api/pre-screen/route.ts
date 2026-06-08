import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cbnReferenceForAI } from "@/lib/cbnCharges";

const PreScreenSchema = z.object({
  riskLevel: z.enum(["High", "Medium", "Low", "Insufficient"]),
  complianceStatus: z.string(),
  keyFindings: z.array(z.string()).min(2).max(5),
  chargesAtRisk: z.array(z.string()),
  estimatedRecoveryHint: z.string(),
  recommendation: z.string(),
  urgencyNote: z.string(),
});

// Generated from lib/cbnCharges (single source of truth) so the AI and the
// CBN Rate Checker never drift apart. Accurate to the GBC 2020 (in force).
const CBN_CONTEXT = `${cbnReferenceForAI()}

Banks that charge above these limits (or above a customer's contractually agreed rate) are in breach, and the excess is recoverable up to 6 years retrospectively under BOFIA Act 2020.`;

export async function POST(req: NextRequest) {
  try {
    const { description, turnoverBand, bankName } = await req.json() as {
      description: string;
      turnoverBand?: string;
      bankName?: string;
    };

    if (!description || description.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide more detail about your banking charges or situation." },
        { status: 400 }
      );
    }

    const contextLines = [
      bankName ? `Bank(s) in question: ${bankName}` : "",
      turnoverBand ? `Company annual turnover: ${turnoverBand}` : "",
    ].filter(Boolean).join("\n");

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: PreScreenSchema,
      prompt: `You are a senior forensic accountant specialising in Nigerian bank charge recovery. Analyse the corporate banking situation described below and assess whether excess charges may have been applied in breach of CBN regulations.

CORPORATE BANKING SITUATION:
${description}
${contextLines}

CBN REGULATORY BENCHMARKS:
${CBN_CONTEXT}

ANALYSIS INSTRUCTIONS:
- riskLevel: "High" if clear CBN breaches are identifiable or highly probable; "Medium" if suspicious indicators present; "Low" if compliant or insufficient evidence; "Insufficient" only if truly nothing to assess.
- complianceStatus: One concise sentence on the overall compliance picture.
- keyFindings: 3–5 specific, named findings from the description, each citing the correct Guide basis (e.g. "Account maintenance (CAMF) appears charged on savings or on intra-bank transfers — CAMF applies only to current-account debits to third parties/other banks (§3.1)"; or "Overdraft interest charged above the agreed facility-letter rate" — NOT a fictional 'MPR+7%' cap).
- chargesAtRisk: List the specific charge types that appear non-compliant using current Guide names (e.g. ["CAMF", "Penal Rate", "LC Confirmation", "SWIFT commission"]). Only use "COT" if the period is clearly pre-2016.
- estimatedRecoveryHint: A qualitative but specific hint (e.g. "Based on the described turnover and banking history, a forensic audit could reveal ₦5M–₦25M in recoverable excess charges"). Do not be vague.
- recommendation: One direct, action-oriented sentence.
- urgencyNote: Reference the 6-year retrospective recovery window and any time-sensitive element.`,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("[/api/pre-screen]", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
