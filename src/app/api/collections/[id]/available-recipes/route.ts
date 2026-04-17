import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type Params = Promise<{ id: string }>;

// Returns all recipes NOT already in this collection, for the add-recipe picker.
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId } = await params;

  const recipes = await db.recipe.findMany({
    where: {
      collections: { none: { collectionId } },
    },
    select: {
      id: true, title: true, description: true,
      prepTime: true, cookTime: true, servings: true,
      photos: { orderBy: { order: "asc" }, take: 1 },
      tags: { include: { tag: true } },
    },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(recipes);
}
