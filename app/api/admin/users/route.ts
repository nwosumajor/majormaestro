import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest, hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  const users = await db.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  return NextResponse.json({
    items: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  try {
    const { email, password, role } = (await req.json()) as {
      email?: string;
      password?: string;
      role?: string;
    };

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!password || password.length < 12) {
      return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();
    const existing = await db.adminUser.findUnique({ where: { email: normEmail } });
    if (existing) {
      return NextResponse.json({ error: "An admin with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.adminUser.create({
      data: { email: normEmail, passwordHash, role: role === "owner" ? "owner" : "admin" },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const actor = await getAdminFromRequest(req);
    await recordAudit({
      action: "admin_user_create",
      actorLabel: actor?.email ?? "admin",
      targetType: "AdminUser",
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return NextResponse.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[/api/admin/users POST]", err);
    return NextResponse.json({ error: "Failed to create admin." }, { status: 500 });
  }
}
