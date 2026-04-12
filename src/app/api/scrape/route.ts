import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseIngredientLine } from "@/lib/ingredient-parser";

// ---------------------------------------------------------------------------
// JSON-LD recipe extractor
// Most major recipe sites (AllRecipes, BBC Good Food, Serious Eats, NYT
// Cooking, Delish, etc.) embed structured data for Google recipe cards.
// This is more reliable than HTML scraping and requires zero extra deps.
// ---------------------------------------------------------------------------

type JsonLd = Record<string, unknown>;

function findRecipeNode(data: unknown): JsonLd | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as JsonLd;

  // Direct Recipe node
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return obj;
  }

  // @graph array (common on WordPressrecipe sites)
  if (Array.isArray(obj["@graph"])) {
    for (const node of obj["@graph"] as unknown[]) {
      const found = findRecipeNode(node);
      if (found) return found;
    }
  }

  // Nested inside another object (e.g. { "@type": "WebPage", "mainEntity": {...} })
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = findRecipeNode(val);
      if (found) return found;
    }
  }

  return null;
}

function extractText(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (val && typeof val === "object") {
    const o = val as JsonLd;
    return String(o.text ?? o.name ?? o["@value"] ?? "").trim();
  }
  return "";
}

function parseIsoDuration(iso: unknown): number | undefined {
  if (typeof iso !== "string") return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return undefined;
  const hours = parseInt(m[1] ?? "0");
  const mins  = parseInt(m[2] ?? "0");
  return hours * 60 + mins || undefined;
}

function parseYield(val: unknown): number | undefined {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseInt(val);
    return isNaN(n) ? undefined : n;
  }
  if (Array.isArray(val) && val.length > 0) return parseYield(val[0]);
  return undefined;
}

// Strip HTML tags from instruction text (some sites embed <p> tags)
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  // Fetch the page
  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        // Impersonate a browser so sites don't block the request
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json(
      { error: "Could not fetch that URL. Check the address and try again." },
      { status: 422 }
    );
  }

  // Extract all JSON-LD script blocks
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let recipe: JsonLd | null = null;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      recipe = findRecipeNode(Array.isArray(parsed) ? { "@graph": parsed } : parsed);
      if (recipe) break;
    } catch {
      // malformed JSON in this block — keep looking
    }
  }

  if (!recipe) {
    return NextResponse.json(
      {
        error:
          "No structured recipe data found on that page. This works best with major recipe sites (AllRecipes, BBC Good Food, Serious Eats…). Try a different URL or enter the recipe manually.",
      },
      { status: 422 }
    );
  }

  // Parse instructions
  const instructions: string[] = [];
  const rawInstructions = recipe.recipeInstructions;
  if (Array.isArray(rawInstructions)) {
    for (const step of rawInstructions) {
      const text = stripHtml(extractText(step));
      if (text) instructions.push(text);
    }
  } else if (typeof rawInstructions === "string") {
    // Some sites dump a single block — split on newlines / numbered steps
    instructions.push(
      ...rawInstructions
        .split(/\n|\r|\d+\.\s/)
        .map((s) => stripHtml(s.trim()))
        .filter(Boolean)
    );
  }

  // Parse ingredients
  const rawIngredients = recipe.recipeIngredient;
  const ingredients: { name: string; amount: string; unit: string }[] = [];
  if (Array.isArray(rawIngredients)) {
    for (const ing of rawIngredients) {
      const text = extractText(ing);
      if (text) ingredients.push(parseIngredientLine(text));
    }
  }

  return NextResponse.json({
    title:       extractText(recipe.name) || "",
    description: extractText(recipe.description) || "",
    instructions,
    ingredients,
    servings:    parseYield(recipe.recipeYield),
    prepTime:    parseIsoDuration(recipe.prepTime),
    cookTime:    parseIsoDuration(recipe.cookTime),
    sourceUrl:   url,
    tags:        [] as string[],
  });
}
