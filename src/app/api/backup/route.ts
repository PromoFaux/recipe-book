import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { enforceRetention, listBackups, runBackup } from "@/lib/backup";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const backups = await listBackups();
    return NextResponse.json({ backups });
  } catch (err) {
    console.error("List backups error:", err);
    const message = err instanceof Error ? err.message : "Failed to load backups.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const filename = await runBackup();

    // Apply retention policy
    const settings = await db.backupSettings.findUnique({ where: { id: "singleton" } });
    const retentionCount = settings?.retentionCount ?? 5;
    await enforceRetention(retentionCount);

    // Update last backup timestamp
    await db.backupSettings.upsert({
      where: { id: "singleton" },
      update: { lastBackupAt: new Date() },
      create: { id: "singleton", lastBackupAt: new Date() },
    });

    return NextResponse.json({ success: true, filename });
  } catch (err) {
    console.error("Backup error:", err);
    const message = err instanceof Error ? err.message : "Backup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
