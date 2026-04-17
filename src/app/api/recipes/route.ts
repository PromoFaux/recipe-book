import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateAndSaveRecipeImage } from "@/lib/gemini";
import { z } from "zod";

const ingredientSchema = z.object({
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
  servings: z.number().int().positive().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  cookTime: z.number().int().nonnegative().optional(),
  sourceUrl: z.union([z.string().url(), z.literal("")]).optional(),
  ingredients: z.array(ingredientSchema),
  tags: z.array(z.string()),
  skipAiImage: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const recipes = await db.recipe.findMany({
    where: {
      AND: [
        // SQLite LIKE is case-insensitive for ASCII by default — no mode needed
        query
          ? {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
              ],
            }
          : {},
        tag ? { tags: { some: { tag: { name: tag } } } } : {},
      ],
    },
    include: {
      photos: { orderBy: { order: "asc" }, take: 1 },
      tags: { include: { tag: true } },
      createdBy: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ingredients, tags, instructions, skipAiImage, ...rest } = parsed.data;

  // Upsert tags
  const tagRecords = await Promise.all(
    tags.map((name) =>
      db.tag.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const recipe = await db.recipe.create({
    data: {
      ...rest,
      instructions: JSON.stringify(instructions),
      userId: session.user.id,
      ingredients: {
        create: ingredients,
      },
      tags: {
        create: tagRecords.map((t) => ({ tagId: t.id })),
      },
    },
    include: {
      ingredients: true,
      tags: { include: { tag: true } },
      photos: true,
    },
  });

  // Generate an AI image in the background when no photo was uploaded
  if (recipe.photos.length === 0 && !skipAiImage) {
    after(() =>
      generateAndSaveRecipeImage(
        recipe.id,
        recipe.title,
        recipe.description,
        recipe.ingredients
      )
    );
  }

  return NextResponse.json(recipe, { status: 201 });
}
