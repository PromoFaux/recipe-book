import { dirname, join, resolve } from "node:path";

/**
 * The directory that holds persistent data (SQLite DB + uploaded photos).
 * Derived from DATABASE_URL (e.g. "file:/app/data/recipes.db" → "/app/data")
 * with a fallback to <cwd>/data for local development.
 */
function getDataDir(): string {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    return dirname(resolve(url.replace("file:", "")));
  }
  // Fallback for local dev when DATABASE_URL is not set
  return resolve(join(/*turbopackIgnore: true*/ process.cwd(), "data"));
}

export const DATA_DIR = getDataDir();

/** Where uploaded recipe photos are stored: <DATA_DIR>/uploads/<recipeId>/<filename> */
export const UPLOADS_DIR = join(DATA_DIR, "uploads");
