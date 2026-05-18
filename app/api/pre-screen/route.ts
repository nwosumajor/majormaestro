import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PreScreenSchema = z.object({
  riskLevel: z.enum(["High", "Medium", "Low", "Insufficient"]),
  complianceStatus: z.string(),
  keyFindings: z.array(z.string()).min(2).max(5),
  chargesAtRisk: z.array(z.string()),
  estimatedRecoveryHint: z.string(),
  recommendation: z.string(),
  urgencyNote: z.string(),
});

const CBN_CONTEXT = `
CURRENT CBN APPROVED CHARGE LIMITS (Guide to Bank Charges, as amended):
- COT (Commission on Turnover): ₦1 per mille (0.1%) max on debit transactions
- Account Maintenance Fee (Current accounts): ₦1 per mille per quarter max
- Overdraft Interest: Maximum of MPR + 7% per annum (CBN MPR is currently 27.5%, so cap ≈ 34.5%)
- Term Loan Interest: Subject to CBN ceiling; excess above agreed rate is recoverable
- SWIFT Transfer Fee: $25 USD flat max per transaction
- LC Confirmation Charges: 0.5% – 1.5% of LC value per quarter
- Credit Risk Premium: 2% per annum max (added to base rate)
- Annual Facility Management/Review Fee: ₦10,000 max
- Account Closure Fee: ₦500 max
- Cheque book (25 leaves): ₦1,500 max
- Reference letter: ₦500 max

Banks that charge above these rates are in breach of CBN regulations and the excess is legally recoverable under BOFIA Act 2020.
`.trim();

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
- keyFindings: 3–5 specific, named findings from the description (e.g. "COT rate of 0.5% mentioned — CBN maximum is 0.1%, potential excess of 0.4% per transaction").
- chargesAtRisk: List the specific charge types that appear non-compliant (e.g. ["COT", "Overdraft Interest", "SWIFT Fees"]).
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
