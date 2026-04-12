import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_DIMENSION = 1600; // px
const JPEG_QUALITY = 82;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const recipeId = formData.get("recipeId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!recipeId) return NextResponse.json({ error: "No recipeId" }, { status: 400 });

  // Verify recipe exists
  const recipe = await db.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.jpg`;

  // Compress & resize with Sharp
  const imageBuffer = await sharp(buffer)
    .rotate() // auto-rotate from EXIF
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer();

  // Write to filesystem: <UPLOADS_DIR>/<recipeId>/<filename>
  const recipeUploadsDir = join(UPLOADS_DIR, recipeId);
  await mkdir(recipeUploadsDir, { recursive: true });
  await writeFile(join(recipeUploadsDir, filename), imageBuffer);

  const count = await db.photo.count({ where: { recipeId } });

  const photo = await db.photo.create({
    data: { filename, recipeId, order: count },
  });

  return NextResponse.json({ id: photo.id, filename, recipeId, url: `/uploads/${recipeId}/${filename}` });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("id");
  if (!photoId) return NextResponse.json({ error: "No id" }, { status: 400 });

  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.photo.delete({ where: { id: photoId } });

  // Remove the file from disk (best-effort — don't fail the request if already gone)
  await unlink(join(UPLOADS_DIR, photo.recipeId, photo.filename)).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
