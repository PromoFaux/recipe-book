import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const ingredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  amount: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().default(0),
});

const recipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.array(z.string()),
  servings: z.number().int().positive().optional().nullable(),
  prepTime: z.number().int().nonnegative().optional().nullable(),
  cookTime: z.number().int().nonnegative().optional().nullable(),
  sourceUrl: z.string().optional(),
  ingredients: z.array(ingredientSchema),
  tags: z.array(z.string()),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      photos: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      createdBy: { select: { name: true, image: true, email: true } },
    },
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ingredients, tags, instructions, ...rest } = parsed.data;

  // Upsert tags
  const tagRecords = await Promise.all(
    tags.map((name) =>
      db.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // Replace ingredients and tags
  await db.ingredient.deleteMany({ where: { recipeId: id } });
  await db.tagsOnRecipes.deleteMany({ where: { recipeId: id } });

  const updated = await db.recipe.update({
    where: { id },
    data: {
      ...rest,
      instructions: JSON.stringify(instructions),
      ingredients: { create: ingredients.map(({ id: _id, ...i }) => i) },
      tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
    },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      photos: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.recipe.delete({ where: { id } });

  // Remove uploaded photos from disk (best-effort — don't fail if already gone)
  await rm(join(UPLOADS_DIR, id), { recursive: true, force: true }).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
