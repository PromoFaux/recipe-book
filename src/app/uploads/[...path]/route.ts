import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  if (path.length < 2) return new NextResponse("Not found", { status: 404 });

  const [recipeId, filename] = path;

  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  // Prefer serving from the filesystem (new uploads)
  try {
    const data = await readFile(join(UPLOADS_DIR, recipeId, filename));
    return new NextResponse(data, { headers });
  } catch {
    // Fall through to DB blob for photos uploaded before the filesystem migration
  }

  // Legacy fallback: read blob from the database
  const photo = await db.photo.findFirst({
    where: { recipeId, filename },
    select: { data: true },
  });

  if (!photo?.data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(photo.data), { headers });
}
