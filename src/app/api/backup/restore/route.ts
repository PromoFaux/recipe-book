import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/auth";
import { restoreBackup } from "@/lib/backup";

const restoreSchema = z.object({
  key: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    await restoreBackup(parsed.data.key);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restore backup error:", err);
    const message = err instanceof Error ? err.message : "Restore failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
