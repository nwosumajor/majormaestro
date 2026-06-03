import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientUserFromRequest } from "@/lib/auth";
import { runClassification } from "@/lib/classify";
import { SEED_POSITIONS, parseCertificates } from "@/lib/classificationSchema";

// Fixed-enum output schema — unchanged (individual flow returns exactly 3 with
// confidenceScore + skillGaps). The bulk flow uses a different, dynamic schema.
const ClassificationSchema = z.object({
  results: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(3),
        departmentName: z.string(),
        industryCategory: z.string(),
        reasoning: z.string(),
        confidenceScore: z.number().min(0).max(100),
        skillGaps: z.array(z.string()).max(3),
      })
    )
    .length(3),
});

const INSTRUCTIONS = `- Return EXACTLY 3 department recommendations, ranked 1 (best fit) to 3.
- departmentName must be an exact match from the department lists above.
- industryCategory must be the exact bracket label (e.g. "Banking & Financial Services").
- reasoning must be 2–4 sentences connecting profile attributes and certifications to the department.
- confidenceScore is an integer 0–100 representing how well the profile fits this department.
- skillGaps is an array of 2–3 specific, named skills or qualifications the person currently lacks for this department (e.g. "No hands-on SQL experience", "Missing risk certification like FRM").
- Do not repeat the same industryCategory for all three results — aim for diversity where the profile supports it.`;

export async function POST(req: NextRequest) {
  // Individual classification is now gated behind client auth.
  const user = await getClientUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Please sign in to run a classification." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { psychological, mental, social, environmental, certificates } = body;

    if (!psychological || !mental || !social || !environmental) {
      return NextResponse.json(
        { error: "All four attribute sections are required." },
        { status: 400 }
      );
    }

    const object = await runClassification({
      input: {
        psychological,
        mental,
        social,
        environmental,
        certificates: Array.isArray(certificates) ? certificates : parseCertificates(certificates),
      },
      allowed: SEED_POSITIONS, // fixed enum
      schema: ClassificationSchema,
      instructions: INSTRUCTIONS,
    });

    return NextResponse.json(object.results);
  } catch (err) {
    console.error("[/api/classify]", err);
    return NextResponse.json(
      { error: "Classification failed. Please try again." },
      { status: 500 }
    );
  }
}
