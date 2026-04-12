import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { path } = await params;
  if (path.length < 2) return new NextResponse("Not found", { status: 404 });

  const [recipeId, filename] = path;

  const photo = await db.photo.findFirst({
    where: { recipeId, filename },
    select: { data: true },
  });

  if (!photo?.data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(photo.data, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
