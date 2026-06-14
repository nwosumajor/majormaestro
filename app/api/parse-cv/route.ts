import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

const CVSchema = z.object({
  psychological: z.string(),
  mental: z.string(),
  social: z.string(),
  environmental: z.string(),
  certificates: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`parse-cv:${getClientIp(req)}`, 10, 60 * 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text.trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "Could not extract text from the PDF. Please try a different file." },
        { status: 422 }
      );
    }

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: CVSchema,
      prompt: `You are an expert HR analyst. Analyse the following CV/resume and extract a structured staff profile.

CV TEXT:
${extractedText.slice(0, 8000)}

INSTRUCTIONS:
- psychological: Summarise the candidate's inferred personality traits, temperament, motivations, and cognitive style based on their career history and the language they use. Write 2–4 descriptive sentences.
- mental: Summarise their intellectual strengths, analytical abilities, technical depth, and learning style based on their qualifications and roles. Write 2–4 descriptive sentences.
- social: Summarise their interpersonal skills, communication style, leadership experience, and team dynamics based on job titles and responsibilities. Write 2–4 descriptive sentences.
- environmental: Infer their preferred work environment, pace, structure preference, and stress tolerance from their career trajectory. Write 2–4 descriptive sentences.
- certificates: Extract every named qualification, certification, degree, or professional credential mentioned in the CV as a clean array of strings. Include degrees (e.g. "B.Sc Computer Science"), professional certs (e.g. "AWS Solutions Architect"), and industry qualifications.`,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("[/api/parse-cv]", err);
    return NextResponse.json(
      { error: "CV parsing failed. Please try again or fill in the fields manually." },
      { status: 500 }
    );
  }
}
