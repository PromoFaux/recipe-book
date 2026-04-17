import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = Promise<{ id: string }>;

const bodySchema = z.object({ recipeId: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await db.recipesOnCollections.upsert({
    where: { recipeId_collectionId: { recipeId: parsed.data.recipeId, collectionId } },
    create: { recipeId: parsed.data.recipeId, collectionId },
    update: {},
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId } = await params;
  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipeId");

  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

  await db.recipesOnCollections.delete({
    where: { recipeId_collectionId: { recipeId, collectionId } },
  });

  return new NextResponse(null, { status: 204 });
}
