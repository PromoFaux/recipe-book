import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import { createReadStream } from "fs";
import { join } from "path";
import { stat } from "fs/promises";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? join(/*turbopackIgnore: true*/ process.cwd(), "data", "recipes.db");
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: "Google Drive backup folder not configured." }, { status: 503 });
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return NextResponse.json({ error: "Service account not configured." }, { status: 503 });
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Check DB exists
    try {
      await stat(DB_PATH);
    } catch {
      return NextResponse.json({ error: "Database file not found." }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recipes-backup-${timestamp}.db`;

    // Check if a previous backup exists with same base name to update it
    const existing = await drive.files.list({
      q: `name contains 'recipes-backup' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 1,
      fields: "files(id, name)",
    });

    const stream = createReadStream(DB_PATH);

    if (existing.data.files && existing.data.files.length > 0) {
      // Update existing file in place
      await drive.files.update({
        fileId: existing.data.files[0].id!,
        requestBody: { name: filename },
        media: { mimeType: "application/octet-stream", body: stream },
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: filename,
          parents: [DRIVE_FOLDER_ID],
        },
        media: { mimeType: "application/octet-stream", body: stream },
      });
    }

    return NextResponse.json({ success: true, filename });
  } catch (err) {
    console.error("Backup error:", err);
    return NextResponse.json({ error: "Backup failed." }, { status: 500 });
  }
}
