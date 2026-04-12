import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { preferMetric } = await req.json();

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { preferMetric: Boolean(preferMetric) },
  });

  return NextResponse.json({ preferMetric: user.preferMetric });
}
