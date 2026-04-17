import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const collection = await db.collection.findUnique({
    where: { id },
    include: {
      recipes: {
        include: {
          recipe: {
            include: {
              photos: { orderBy: { order: "asc" }, take: 1 },
              tags: { include: { tag: true } },
              ingredients: true,
              createdBy: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { recipes: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(collection);
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const collection = await db.collection.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    },
    include: {
      _count: { select: { recipes: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json(collection);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.collection.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
