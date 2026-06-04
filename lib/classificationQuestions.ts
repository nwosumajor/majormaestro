/**
 * Structured questionnaire for the INDIVIDUAL classification flow (/assessment).
 *
 * 12 core questions (3 per P/M/S/E domain) give a usable profile on their own;
 * 8 optional refiners (2 per domain) sharpen it. Each answer maps to a trait
 * label. synthesizeAttributes() rolls the selected traits up into the 4 P/M/S/E
 * strings that /api/classify already expects — so the API contract, the shared
 * classify lib, and the bulk flow are all unchanged; the input is just richer.
 */
import type { AttributeKey } from "@/lib/classificationSchema";

export interface QuestionOption {
  label: string; // answer text shown to the user
  trait: string; // the signal this answer contributes
}
export interface Question {
  id: string;
  domain: AttributeKey;
  core: boolean;
  text: string;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  // ── Psychological — core ──
  {
    id: "C1", domain: "psychological", core: true,
    text: "What energizes you most at the end of a workday?",
    options: [
      { label: "Having solved a hard problem nobody else could crack", trait: "mastery-driven" },
      { label: "Knowing my work directly helped someone", trait: "purpose-driven" },
      { label: "Hitting a target or beating a deadline", trait: "achievement-driven" },
      { label: "A calm day where everything ran smoothly", trait: "harmony-driven" },
    ],
  },
  {
    id: "C2", domain: "psychological", core: true,
    text: "Offered two roles — one with a clear, stable path, one ambiguous but high-upside — you lean toward:",
    options: [
      { label: "The stable path — predictability lets me do my best work", trait: "stability-oriented" },
      { label: "The ambiguous one — uncertainty is where the interesting growth is", trait: "risk-tolerant" },
      { label: "Whichever pays more; I'll adapt to either", trait: "outcome-driven" },
      { label: "I'd need to map both fully before I could choose", trait: "deliberative" },
    ],
  },
  {
    id: "C3", domain: "psychological", core: true,
    text: "Under sustained pressure with no end in sight, you:",
    options: [
      { label: "Stay steady; pressure barely changes how I operate", trait: "high stress tolerance" },
      { label: "Perform sharply in bursts but need recovery time", trait: "intense / cyclical" },
      { label: "Start systematically cutting scope to protect quality", trait: "strategic under load" },
      { label: "Pull others in early rather than carry it alone", trait: "collaborative coping" },
    ],
  },
  // ── Mental — core ──
  {
    id: "C4", domain: "mental", core: true,
    text: "Handed a problem you've never seen before, you start by:",
    options: [
      { label: "Breaking it into smaller known pieces", trait: "analytical / structured" },
      { label: "Looking for a similar problem I've solved and adapting it", trait: "pattern-based" },
      { label: "Experimenting quickly to see what the problem actually is", trait: "empirical / iterative" },
      { label: "Researching how others have approached it first", trait: "knowledge-gathering" },
    ],
  },
  {
    id: "C5", domain: "mental", core: true,
    text: "Which kind of task makes time disappear for you?",
    options: [
      { label: "Untangling something complex and messy into order", trait: "structuring / analytical" },
      { label: "Designing or creating something from a blank page", trait: "generative / creative" },
      { label: "Optimizing a process until it's efficient", trait: "refinement-oriented" },
      { label: "Digging deep into one topic until I fully understand it", trait: "depth / specialist" },
    ],
  },
  {
    id: "C6", domain: "mental", core: true,
    text: "When making a decision with incomplete information, you:",
    options: [
      { label: "Go with the data I have and adjust later", trait: "decisive" },
      { label: "Hold off until I can gather more", trait: "cautious / thorough" },
      { label: "Trust an informed gut feeling", trait: "intuitive" },
      { label: "Build a few scenarios and pick the most robust", trait: "systems thinker" },
    ],
  },
  // ── Social — core ──
  {
    id: "C7", domain: "social", core: true,
    text: "In a group project, you naturally end up:",
    options: [
      { label: "Coordinating who does what and tracking progress", trait: "organizer / leader" },
      { label: "Generating ideas and getting people excited", trait: "catalyst / influencer" },
      { label: "Doing the heavy technical lifting quietly", trait: "individual contributor" },
      { label: "Smoothing tensions and keeping everyone aligned", trait: "mediator / connector" },
    ],
  },
  {
    id: "C8", domain: "social", core: true,
    text: "Two respected colleagues disagree sharply in a meeting. You:",
    options: [
      { label: "Step in to find the common ground", trait: "diplomat" },
      { label: "Pick the stronger argument and back it openly", trait: "decisive / direct" },
      { label: "Stay quiet and let it resolve itself", trait: "non-confrontational" },
      { label: "Ask questions until the real issue surfaces", trait: "facilitator" },
    ],
  },
  {
    id: "C9", domain: "social", core: true,
    text: "At a work social event where you know few people, you:",
    options: [
      { label: "Find one or two people and have real conversations", trait: "introverted / depth" },
      { label: "Work the room and meet as many people as possible", trait: "extroverted / breadth" },
      { label: "Stick with colleagues I already know", trait: "comfort-seeking" },
      { label: "Use it to make connections useful for future work", trait: "strategic networker" },
    ],
  },
  // ── Environmental — core ──
  {
    id: "C10", domain: "environmental", core: true,
    text: "You do your best work when the environment is:",
    options: [
      { label: "Quiet and uninterrupted, with deep focus time", trait: "low-stimulation / focus" },
      { label: "Buzzing, collaborative, lots of interaction", trait: "high-stimulation / social" },
      { label: "Flexible — I move between focus and collaboration as needed", trait: "adaptive" },
      { label: "Highly structured with clear routines and expectations", trait: "structure-dependent" },
    ],
  },
  {
    id: "C11", domain: "environmental", core: true,
    text: "Your ideal level of supervision is:",
    options: [
      { label: "Set me a goal and leave me alone to deliver it", trait: "autonomous" },
      { label: "Regular check-ins to stay aligned", trait: "collaborative oversight" },
      { label: "Clear instructions and defined processes to follow", trait: "direction-seeking" },
      { label: "A mentor I can go to when I choose", trait: "self-directed with support" },
    ],
  },
  {
    id: "C12", domain: "environmental", core: true,
    text: "Which work rhythm suits you best?",
    options: [
      { label: "Steady, predictable, consistent daily pace", trait: "steady-state" },
      { label: "Variety — different tasks and challenges each day", trait: "variety-seeking" },
      { label: "Intense sprints followed by lighter periods", trait: "cyclical / project-based" },
      { label: "Fast-paced and high-pressure most of the time", trait: "high-tempo" },
    ],
  },

  // ── Optional refiners ──
  {
    id: "R1", domain: "psychological", core: false,
    text: "A project you've poured weeks into gets cancelled the day before launch. Your first instinct is to:",
    options: [
      { label: "Ask what went wrong so the next attempt avoids it", trait: "analytical / resilient" },
      { label: "Feel the loss, then quickly redirect energy to the next thing", trait: "adaptive / optimistic" },
      { label: "Push back and argue the decision should be reversed", trait: "assertive / conviction-driven" },
      { label: "Quietly accept it; decisions above my level aren't worth the friction", trait: "pragmatic / deferential" },
    ],
  },
  {
    id: "R2", domain: "psychological", core: false,
    text: "When you receive harsh but fair criticism, you typically:",
    options: [
      { label: "Sit with it; it stings but I extract the lesson", trait: "reflective" },
      { label: "Act on it immediately to prove I can improve", trait: "action-oriented" },
      { label: "Test whether it's actually valid before changing anything", trait: "skeptical / independent" },
      { label: "Find it motivating — I work best with something to prove", trait: "competitive" },
    ],
  },
  {
    id: "R3", domain: "mental", core: false,
    text: "You learn a new tool or skill fastest by:",
    options: [
      { label: "Reading the documentation thoroughly before touching it", trait: "theory-first" },
      { label: "Diving in and breaking things until it clicks", trait: "hands-on" },
      { label: "Watching someone experienced do it, then copying", trait: "observational" },
      { label: "Teaching it to someone else as I go", trait: "social / articulative learning" },
    ],
  },
  {
    id: "R4", domain: "mental", core: false,
    text: "You're told your usual method is now obsolete and you must relearn from scratch. You:",
    options: [
      { label: "Treat it as a welcome reset — fresh methods, fewer bad habits", trait: "growth mindset" },
      { label: "Feel resistance but get on with it", trait: "adaptive / pragmatic" },
      { label: "First want to understand why the old way failed", trait: "critical / evaluative" },
      { label: "Look for what transfers from the old method to speed things up", trait: "efficiency-seeking" },
    ],
  },
  {
    id: "R5", domain: "social", core: false,
    text: "You prefer feedback that is:",
    options: [
      { label: "Direct and unfiltered, even if blunt", trait: "thick-skinned / candid" },
      { label: "Honest but delivered considerately", trait: "balanced" },
      { label: "Framed around what to do next, not what went wrong", trait: "forward-focused" },
      { label: "Backed by specific examples I can verify", trait: "evidence-oriented" },
    ],
  },
  {
    id: "R6", domain: "social", core: false,
    text: "A teammate is consistently underperforming and it's affecting you. You:",
    options: [
      { label: "Talk to them directly and privately", trait: "direct / relational" },
      { label: "Raise it with the manager", trait: "escalation / structure" },
      { label: "Quietly absorb the extra load to keep things moving", trait: "self-sacrificing" },
      { label: "Suggest restructuring the work so it's less dependent on them", trait: "systemic problem-solver" },
    ],
  },
  {
    id: "R7", domain: "environmental", core: false,
    text: "Regarding where you work:",
    options: [
      { label: "Fully remote — I'm most productive on my own terms", trait: "autonomy / remote" },
      { label: "In-person — I need the energy and immediacy of a team", trait: "co-location" },
      { label: "Hybrid balance of both", trait: "flexible" },
      { label: "Doesn't matter as long as the work is meaningful", trait: "setting-agnostic" },
    ],
  },
  {
    id: "R8", domain: "environmental", core: false,
    text: "You join an organization whose culture is the opposite of what you expected. You:",
    options: [
      { label: "Adapt my style to fit in", trait: "high adaptability" },
      { label: "Stay true to how I work and find my niche", trait: "identity-stable" },
      { label: "Try to gradually shift the parts that don't work", trait: "change agent" },
      { label: "Reassess whether it's the right fit at all", trait: "values-driven" },
    ],
  },
];

export const CORE_QUESTIONS = QUESTIONS.filter((q) => q.core);
export const OPTIONAL_QUESTIONS = QUESTIONS.filter((q) => !q.core);

export const DOMAIN_LABELS: Record<AttributeKey, string> = {
  psychological: "Psychological",
  mental: "Mental",
  social: "Social",
  environmental: "Environmental",
};

/** answers: map of questionId → selected option index. */
export type Answers = Record<string, number>;

/**
 * Roll selected traits up into the 4 P/M/S/E strings /api/classify expects.
 * Includes both core and any answered optional refiners.
 */
export function synthesizeAttributes(answers: Answers): Record<AttributeKey, string> {
  const byDomain: Record<AttributeKey, string[]> = {
    psychological: [],
    mental: [],
    social: [],
    environmental: [],
  };
  for (const q of QUESTIONS) {
    const idx = answers[q.id];
    if (idx == null) continue;
    const opt = q.options[idx];
    if (opt) byDomain[q.domain].push(opt.trait);
  }
  return {
    psychological: dedupe(byDomain.psychological).join(", "),
    mental: dedupe(byDomain.mental).join(", "),
    social: dedupe(byDomain.social).join(", "),
    environmental: dedupe(byDomain.environmental).join(", "),
  };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

export function coreComplete(answers: Answers): boolean {
  return CORE_QUESTIONS.every((q) => answers[q.id] != null);
}

export function coreAnsweredCount(answers: Answers): number {
  return CORE_QUESTIONS.filter((q) => answers[q.id] != null).length;
}
