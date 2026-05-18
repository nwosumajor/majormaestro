import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RoadmapSchema = z.object({
  roadmap: z.array(
    z.object({
      timeframe: z.string(),
      milestoneName: z.string(),
      strategicReasoning: z.string(),
      salaryRange: z.object({
        range: z.string(),
        basis: z.string(),
      }),
      recommendedCertifications: z.array(
        z.object({
          name: z.string(),
          provider: z.string(),
          estimatedCost: z.string(),
          estimatedDuration: z.string(),
        })
      ),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentRole, currentIndustry, currentExperience, futureRole, timeHorizon } =
      body;

    if (!currentRole || !futureRole || !timeHorizon) {
      return NextResponse.json(
        { error: "Current role, desired role, and time horizon are required." },
        { status: 400 }
      );
    }

    const experienceLine = currentExperience
      ? `Current Years of Experience: ${currentExperience}`
      : "";
    const industryLine = currentIndustry
      ? `Current Industry: ${currentIndustry}`
      : "";

    const prompt = `You are a world-class executive career strategist with deep knowledge of industry hiring trends, professional development paths, and certification ecosystems.

Build a strategic career roadmap for the following professional:

CURRENT STATE:
- Current Role: ${currentRole}
${industryLine}
${experienceLine}

FUTURE STATE:
- Target Role: ${futureRole}
- Time Horizon: ${timeHorizon} year${Number(timeHorizon) > 1 ? "s" : ""}

INSTRUCTIONS:
- Divide the ${timeHorizon}-year journey into logical phases (e.g. "Year 1", "Year 1–2", "Year 3–5"). Use fewer, broader phases for longer horizons; shorter, tighter phases for 1–3 year horizons.
- Each phase must have a clear milestoneName (what the person achieves by the end of that phase).
- strategicReasoning must explicitly ground each milestone in real industry dynamics — hiring patterns, market demand, seniority gates, or role prerequisites. No generic advice.
- salaryRange.range should reflect realistic compensation at that milestone level (e.g. "₦4,000,000 – ₦8,000,000 / $5,000 – $10,000 per annum"). Tailor to the industry.
- salaryRange.basis is the payment period, e.g. "per annum".
- recommendedCertifications: for each cert, provide the exact name, issuing body/provider, realistic cost range, and estimated study duration. Use an empty array [] if no cert is needed.
- The roadmap must be realistic, sequential, and lead clearly from the current state to the target role within the stated time horizon.`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: RoadmapSchema,
      prompt,
    });

    return NextResponse.json(object.roadmap);
  } catch (err) {
    console.error("[/api/roadmap]", err);
    return NextResponse.json(
      { error: "Roadmap generation failed. Please try again." },
      { status: 500 }
    );
  }
}
