import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const VALID_INTERVALS = [6, 12, 24, 48, 168];

const updateSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().refine((v) => VALID_INTERVALS.includes(v), {
    message: "Invalid interval",
  }),
  retentionCount: z.number().int().min(1).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.backupSettings.findUnique({ where: { id: "singleton" } });

  return NextResponse.json(
    settings ?? { enabled: false, intervalHours: 24, retentionCount: 5, lastBackupAt: null }
  );
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { enabled, intervalHours, retentionCount } = parsed.data;

  const settings = await db.backupSettings.upsert({
    where: { id: "singleton" },
    update: { enabled, intervalHours, retentionCount },
    create: { id: "singleton", enabled, intervalHours, retentionCount },
  });

  return NextResponse.json(settings);
}
