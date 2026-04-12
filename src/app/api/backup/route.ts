import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { DATA_DIR } from "@/lib/paths";

const execFileAsync = promisify(execFile);

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

  // Verify the data directory exists and contains the database
  try {
    await stat(join(DATA_DIR, "recipes.db"));
  } catch {
    return NextResponse.json({ error: "Database file not found." }, { status: 404 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `recipes-backup-${timestamp}.tar.gz`;
  const archivePath = join(tmpdir(), filename);

  try {
    // Create a compressed archive of the entire data directory (DB + photos)
    await execFileAsync("tar", ["czf", archivePath, "-C", DATA_DIR, "."]);
  } catch (err) {
    console.error("Archive error:", err);
    await unlink(archivePath).catch(() => {});
    return NextResponse.json({ error: "Failed to create backup archive." }, { status: 500 });
  }

  try {
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Reuse the existing backup file on Drive if one exists (saves quota)
    const existing = await drive.files.list({
      q: `name contains 'recipes-backup' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      orderBy: "createdTime desc",
      pageSize: 1,
      fields: "files(id, name)",
    });

    const stream = createReadStream(archivePath);

    if (existing.data.files && existing.data.files.length > 0) {
      await drive.files.update({
        fileId: existing.data.files[0].id!,
        requestBody: { name: filename },
        media: { mimeType: "application/gzip", body: stream },
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: filename,
          parents: [DRIVE_FOLDER_ID],
        },
        media: { mimeType: "application/gzip", body: stream },
      });
    }

    return NextResponse.json({ success: true, filename });
  } catch (err) {
    console.error("Backup error:", err);
    return NextResponse.json({ error: "Backup failed." }, { status: 500 });
  } finally {
    // Always clean up the temporary archive
    await unlink(archivePath).catch(() => {});
  }
}
