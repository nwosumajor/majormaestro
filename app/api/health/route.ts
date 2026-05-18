import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let dbStatus: "ok" | "error" | "disabled" = "disabled";
  if (db) {
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = "ok";
    } catch {
      dbStatus = "error";
    }
  }

  const overall = dbStatus === "error" ? "degraded" : "ok";

  return NextResponse.json(
    {
      status: overall,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
    { status: overall === "ok" ? 200 : 503 }
  );
}
