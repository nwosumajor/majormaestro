import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SingleResultSchema = z.object({
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

const ALLOWED_DEPARTMENTS = `
[Banking & Financial Services]: Corporate Banking, Retail Banking, Treasury, Risk Management, Compliance and AML, Internal Audit, Customer Service, Investment Banking, Corporate Communications, Trade Finance, Human Resources, Legal Services, Strategy and Analytics.
[Technology & Software Engineering]: Software Development, DevOps & Cloud Infrastructure, Platform Engineering, QA & Automation, Data Science & AI, Product Management, UX/UI Design, Cybersecurity & InfoSec, IT Service Management.
[Fintech & Digital Payments]: Payment Gateway Engineering, Blockchain & Web3, Core Banking Integration, E-Channel Security, Fraud Operations, Digital Wallet Management, Product Operations, Fintech Compliance.
[Manufacturing, FMCG & Production]: Production Department, QA/QC, Supply Chain, Procurement, Maintenance/Engineering, Logistics, Product Development, Sales, Brand Management, HSE, Corporate Affairs, Warehouse Management.
[Food Restaurant Chain & Hospitality]: F&B Management, Kitchen Operations, Front Office, Housekeeping, Restaurant Operations, Franchise Management.
[General Corporate Support Services]: HR & Admin, Finance & Accounts, Legal & Secretariat, IT, Corporate Strategy, Marketing & Comms, Internal Control, Facility Management.
`.trim();

interface BulkProfile {
  name: string;
  psychological: string;
  mental: string;
  social: string;
  environmental: string;
  certificates: string;
}

async function classifyOne(profile: BulkProfile) {
  const prompt = `You are an expert HR strategist. Evaluate the staff profile and return the top 3 best-fit departments.

STAFF: ${profile.name}
- Psychological: ${profile.psychological}
- Mental: ${profile.mental}
- Social: ${profile.social}
- Environmental: ${profile.environmental}
- Certificates: ${profile.certificates || "None"}

ALLOWED DEPARTMENTS:
${ALLOWED_DEPARTMENTS}

Return EXACTLY 3 ranked results. Use exact departmentName and industryCategory strings. Include confidenceScore (0-100) and 2-3 specific skillGaps per result.`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: SingleResultSchema,
    prompt,
  });

  return { name: profile.name, results: object.results };
}

export async function POST(req: NextRequest) {
  try {
    const { profiles } = await req.json() as { profiles: BulkProfile[] };

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: "No profiles provided." }, { status: 400 });
    }

    if (profiles.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 profiles per batch." },
        { status: 400 }
      );
    }

    // Run in parallel batches of 4
    const batchSize = 4;
    const allResults = [];

    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(classifyOne));
      allResults.push(...batchResults);
    }

    return NextResponse.json(allResults);
  } catch (err) {
    console.error("[/api/bulk-classify]", err);
    return NextResponse.json(
      { error: "Bulk classification failed. Please try again." },
      { status: 500 }
    );
  }
}
