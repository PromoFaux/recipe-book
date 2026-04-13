import { db } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
}

/**
 * Generates a food photo for the given recipe using the Gemini image generation
 * API, then saves it to the filesystem and creates a Photo record in the DB.
 *
 * This is a best-effort operation — all errors are silently swallowed so a
 * failed generation never breaks recipe creation.
 *
 * Requires the GEMINI_API_KEY environment variable to be set.
 */
export async function generateAndSaveRecipeImage(
  recipeId: string,
  title: string,
  description: string | null | undefined,
  ingredients: { name: string; amount?: string | null; unit?: string | null }[]
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const ingredientList = ingredients
      .map((i) => [i.amount, i.unit, i.name].filter(Boolean).join(" "))
      .join(", ");

    const promptParts: string[] = [
      `Professional food photography of "${title}".`,
    ];
    if (description) promptParts.push(description);
    if (ingredientList) promptParts.push(`Ingredients: ${ingredientList}.`);
    promptParts.push("Appetizing, well-lit, close-up, studio quality.");

    const prompt = promptParts.join(" ");

    const res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!res.ok) {
      console.error(`[gemini] Image generation failed: HTTP ${res.status}`);
      return;
    }

    const data: GeminiResponse = await res.json();

    const inlineDataPart = data.candidates
      ?.flatMap((c) => c.content?.parts ?? [])
      .find(
        (p): p is { inlineData: { mimeType: string; data: string } } =>
          "inlineData" in p
      );

    if (!inlineDataPart?.inlineData?.data) {
      console.error("[gemini] No image data in response");
      return;
    }

    const imageBuffer = Buffer.from(inlineDataPart.inlineData.data, "base64");

    const processedBuffer = await sharp(imageBuffer)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();

    const filename = `${randomUUID()}.jpg`;
    const recipeUploadsDir = join(UPLOADS_DIR, recipeId);
    await mkdir(recipeUploadsDir, { recursive: true });
    await writeFile(join(recipeUploadsDir, filename), processedBuffer);

    const count = await db.photo.count({ where: { recipeId } });
    await db.photo.create({ data: { filename, recipeId, order: count } });
  } catch (err) {
    console.error("[gemini] Failed to generate recipe image:", err);
  }
}
