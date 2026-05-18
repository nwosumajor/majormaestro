import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    context: { type: string; results: unknown; input?: unknown };
  };

  const systemPrompt =
    context?.type === "classification"
      ? `You are an expert HR strategist and career advisor. The user has just received an AI staff classification result. Help them understand, interpret, and act on their results.

CLASSIFICATION RESULTS:
${JSON.stringify(context.results, null, 2)}

Guidelines:
- Answer questions about why they ranked in specific departments.
- Explain skill gaps clearly and suggest concrete ways to close them.
- Help them decide between the ranked options.
- If asked about next steps, recommend building a career roadmap for their top match.
- Be direct, specific, and grounded in the profile data. Do not make up information not in the results.`
      : `You are a world-class executive career strategist. The user has just received an AI-generated career roadmap. Help them understand, refine, and commit to their plan.

ROADMAP DETAILS:
${JSON.stringify(context?.results, null, 2)}

Guidelines:
- Explain the reasoning behind each milestone when asked.
- Suggest how to prioritise certifications if the user is time or budget constrained.
- Offer practical advice on how to approach each phase.
- If asked to adjust the plan, explain what would change and why.
- Be honest about industry realities — do not sugarcoat timelines or difficulty.`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxOutputTokens: 1024,
  });

  return result.toTextStreamResponse();
}
