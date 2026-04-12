import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { mkdir, readFile, rm, stat, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { db } from "@/lib/db";
import { DATA_DIR, UPLOADS_DIR } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export function getS3Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export interface BackupFile {
  key: string;
  size: number;
  lastModified: string | null;
}

async function streamToFile(stream: NodeJS.ReadableStream, filePath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(filePath);
    stream.pipe(output);
    stream.on("error", reject);
    output.on("error", reject);
    output.on("finish", () => resolve());
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOperation<T>(operation: () => Promise<T>, retries = 5, waitMs = 150): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await delay(waitMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function createLocalArchive(archivePath: string) {
  await execFileAsync("tar", ["czf", archivePath, "-C", DATA_DIR, "."]);
}

async function clearDataDir() {
  await mkdir(DATA_DIR, { recursive: true });

  await retryOperation(() => rm(UPLOADS_DIR, { recursive: true, force: true }));
  await retryOperation(() => rm(join(DATA_DIR, "recipes.db"), { force: true }));
  await retryOperation(() => rm(join(DATA_DIR, "recipes.db-wal"), { force: true }));
  await retryOperation(() => rm(join(DATA_DIR, "recipes.db-shm"), { force: true }));
  await retryOperation(() => rm(join(DATA_DIR, "recipes.db-journal"), { force: true }));
}

export async function listBackups(): Promise<BackupFile[]> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2 bucket not configured.");

  const s3 = getS3Client();
  if (!s3) throw new Error("R2 credentials not configured.");

  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "recipes-backup-",
    })
  );

  return (response.Contents ?? [])
    .filter((item) => item.Key)
    .sort((a, b) => {
      const left = a.LastModified?.getTime() ?? 0;
      const right = b.LastModified?.getTime() ?? 0;
      return right - left;
    })
    .map((item) => ({
      key: item.Key!,
      size: item.Size ?? 0,
      lastModified: item.LastModified?.toISOString() ?? null,
    }));
}

/**
 * Run a backup: create a tar.gz of the data directory and upload it to R2.
 * Returns the filename on success or throws on failure.
 */
export async function runBackup(): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2 bucket not configured.");

  const s3 = getS3Client();
  if (!s3) throw new Error("R2 credentials not configured.");

  await stat(join(DATA_DIR, "recipes.db"));

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `recipes-backup-${timestamp}.tar.gz`;
  const archivePath = join(tmpdir(), filename);

  try {
    await execFileAsync("tar", ["czf", archivePath, "-C", DATA_DIR, "."]);
  } catch (err) {
    await unlink(archivePath).catch(() => {});
    throw new Error("Failed to create backup archive.", { cause: err });
  }

  try {
    const body = await readFile(archivePath);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: body,
        ContentType: "application/gzip",
      })
    );

    return filename;
  } finally {
    await unlink(archivePath).catch(() => {});
  }
}

/**
 * Enforce retention: keep only the most recent `retentionCount` backups in R2.
 * Deletes the oldest backups beyond the limit.
 */
export async function enforceRetention(retentionCount: number): Promise<number> {
  const objects = await listBackups();
  if (objects.length <= retentionCount) return 0;

  const toDelete = objects.slice(retentionCount);
  if (toDelete.length === 0) return 0;

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return 0;

  const s3 = getS3Client();
  if (!s3) return 0;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: toDelete.map((item) => ({ Key: item.key })),
        Quiet: true,
      },
    })
  );

  return toDelete.length;
}

export async function restoreBackup(key: string): Promise<void> {
  if (!key.startsWith("recipes-backup-") || !key.endsWith(".tar.gz")) {
    throw new Error("Invalid backup file.");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2 bucket not configured.");

  const s3 = getS3Client();
  if (!s3) throw new Error("R2 credentials not configured.");

  const archivePath = join(tmpdir(), `restore-${Date.now()}.tar.gz`);
  const extractDir = join(tmpdir(), `restore-extract-${Date.now()}`);
  const rollbackArchivePath = join(tmpdir(), `restore-rollback-${Date.now()}.tar.gz`);
  let disconnected = false;

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body || typeof response.Body === "string") {
      throw new Error("Backup file could not be downloaded.");
    }

    await streamToFile(response.Body as NodeJS.ReadableStream, archivePath);
    await mkdir(extractDir, { recursive: true });
    await execFileAsync("tar", ["xzf", archivePath, "-C", extractDir]);
    await stat(join(extractDir, "recipes.db"));
    await createLocalArchive(rollbackArchivePath);

    await db.$disconnect();
    disconnected = true;

    await mkdir(DATA_DIR, { recursive: true });
    await clearDataDir();

    try {
      await execFileAsync("tar", ["xzf", archivePath, "-C", DATA_DIR]);
      await stat(join(DATA_DIR, "recipes.db"));
    } catch (error) {
      await clearDataDir().catch(() => {});
      await execFileAsync("tar", ["xzf", rollbackArchivePath, "-C", DATA_DIR]).catch(() => {});
      throw error;
    }
  } catch (error) {
    throw new Error("Restore failed.", { cause: error });
  } finally {
    if (disconnected) {
      await db.$connect().catch(() => {});
    }
    await unlink(archivePath).catch(() => {});
    await unlink(rollbackArchivePath).catch(() => {});
    await rm(extractDir, { recursive: true, force: true }).catch(() => {});
  }
}
