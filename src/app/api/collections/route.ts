import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipeId") ?? undefined;

  const collections = await db.collection.findMany({
    include: {
      recipes: {
        include: {
          recipe: {
            include: {
              photos: { orderBy: { order: "asc" }, take: 1 },
            },
          },
        },
        orderBy: { addedAt: "asc" },
        take: 1, // just need the first recipe for cover photo
      },
      _count: { select: { recipes: true } },
      createdBy: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // When a recipeId is provided, annotate each collection with isMember
  if (recipeId) {
    const memberships = await db.recipesOnCollections.findMany({
      where: { recipeId },
      select: { collectionId: true },
    });
    const memberSet = new Set(memberships.map((m) => m.collectionId));
    return NextResponse.json(collections.map((c) => ({ ...c, isMember: memberSet.has(c.id) })));
  }

  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const collection = await db.collection.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      userId: session.user.id,
    },
    include: {
      _count: { select: { recipes: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json(collection, { status: 201 });
}
