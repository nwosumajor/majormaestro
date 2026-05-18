import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

const ALLOWED_DEPARTMENTS = `
[Banking & Financial Services]: Corporate Banking, Retail Banking, Treasury, Risk Management, Compliance and AML, Internal Audit, Customer Service, Investment Banking, Corporate Communications, Trade Finance, Human Resources, Legal Services, Strategy and Analytics.

[Technology & Software Engineering]: Software Development, DevOps & Cloud Infrastructure, Platform Engineering, QA & Automation, Data Science & AI, Product Management, UX/UI Design, Cybersecurity & InfoSec, IT Service Management.

[Fintech & Digital Payments]: Payment Gateway Engineering, Blockchain & Web3, Core Banking Integration, E-Channel Security, Fraud Operations, Digital Wallet Management, Product Operations, Fintech Compliance.

[Manufacturing, FMCG & Production]: Production Department, QA/QC, Supply Chain, Procurement, Maintenance/Engineering, Logistics, Product Development, Sales, Brand Management, HSE, Corporate Affairs, Warehouse Management.

[Food Restaurant Chain & Hospitality]: F&B Management, Kitchen Operations, Front Office, Housekeeping, Restaurant Operations, Franchise Management.

[General Corporate Support Services]: HR & Admin, Finance & Accounts, Legal & Secretariat, IT, Corporate Strategy, Marketing & Comms, Internal Control, Facility Management.
`.trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { psychological, mental, social, environmental, certificates } = body;

    if (!psychological || !mental || !social || !environmental) {
      return NextResponse.json(
        { error: "All four attribute sections are required." },
        { status: 400 }
      );
    }

    const certList =
      Array.isArray(certificates) && certificates.length > 0
        ? certificates.join(", ")
        : "None provided";

    const prompt = `You are an expert HR strategist and organisational psychologist. Evaluate the staff profile below and recommend the top 3 best-fit internal departments.

STAFF PROFILE:
- Psychological Attributes: ${psychological}
- Mental Attributes: ${mental}
- Social Attributes: ${social}
- Environmental Attributes: ${environmental}
- Certificates Acquired: ${certList}

ALLOWED DEPARTMENTS (you MUST choose departmentName and industryCategory exactly as written below):
${ALLOWED_DEPARTMENTS}

INSTRUCTIONS:
- Return EXACTLY 3 department recommendations, ranked 1 (best fit) to 3.
- departmentName must be an exact match from the department lists above.
- industryCategory must be the exact bracket label (e.g. "Banking & Financial Services").
- reasoning must be 2–4 sentences connecting profile attributes and certifications to the department.
- confidenceScore is an integer 0–100 representing how well the profile fits this department.
- skillGaps is an array of 2–3 specific, named skills or qualifications the person currently lacks for this department (e.g. "No hands-on SQL experience", "Missing risk certification like FRM").
- Do not repeat the same industryCategory for all three results — aim for diversity where the profile supports it.`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: ClassificationSchema,
      prompt,
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
