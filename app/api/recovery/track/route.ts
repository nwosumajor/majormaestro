import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STEP_KEYS, STEP_DEFS } from "@/lib/recoverySteps";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim().toUpperCase();
  if (!ref || !ref.startsWith("GBN-")) {
    return NextResponse.json({ error: "A valid reference ID is required." }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ error: "Tracking is temporarily unavailable." }, { status: 503 });
  }

  try {
    const complaint = await db.recoveryComplaint.findUnique({
      where: { referenceId: ref },
      include: {
        statusEvents: { orderBy: { reachedAt: "asc" } },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "No case found for that reference ID." }, { status: 404 });
    }

    const eventsByStep = new Map(complaint.statusEvents.map((e) => [e.step, e.reachedAt]));
    let currentStep = 0;
    const steps = STEP_KEYS.map((key, i) => {
      const reachedAt = eventsByStep.get(key);
      if (reachedAt) currentStep = i + 1;
      return {
        key,
        label: STEP_DEFS[key].label,
        description: STEP_DEFS[key].description,
        reachedAt: reachedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      referenceId: complaint.referenceId,
      companyName: complaint.companyName,
      assignedTeam: complaint.assignedTeam ?? "Senior Forensics Team",
      currentStep,
      steps,
    });
  } catch (err) {
    console.error("[/api/recovery/track]", err);
    return NextResponse.json({ error: "Failed to load case status." }, { status: 500 });
  }
}
