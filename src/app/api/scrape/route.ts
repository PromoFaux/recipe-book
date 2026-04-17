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

  // @graph array (common on WordPress recipe sites)
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

function extractImageUrl(val: unknown): string | undefined {
  if (typeof val === "string" && /^https?:\/\//i.test(val)) return val;
  if (val && typeof val === "object") {
    const o = val as JsonLd;
    const candidate = o.url ?? o.contentUrl;
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
  }
  if (Array.isArray(val) && val.length > 0) return extractImageUrl(val[0]);
  return undefined;
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
// Open Graph / meta tag fallback
// Used when no JSON-LD recipe is found — gives us at least title, description,
// and image from og: tags (most sites have these even without structured data).
// ---------------------------------------------------------------------------

interface MetaResult {
  title: string;
  description: string;
  imageUrl: string | undefined;
}

function extractMetaTags(html: string): MetaResult {
  const getMeta = (patterns: RegExp[]): string => {
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return "";
  };

  const title = getMeta([
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);

  const description = getMeta([
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ]);

  const rawImage = getMeta([
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);

  const imageUrl = rawImage && /^https?:\/\//i.test(rawImage) ? rawImage : undefined;

  return { title, description, imageUrl };
}

// ---------------------------------------------------------------------------
// HTML microdata fallback (Schema.org Recipe)
// Handles sites that use itemtype="http://schema.org/Recipe" instead of JSON-LD.
// ---------------------------------------------------------------------------

interface MicrodataRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  imageUrl: string | undefined;
  prepTime: number | undefined;
  cookTime: number | undefined;
  servings: number | undefined;
}

function extractMicrodata(html: string): MicrodataRecipe | null {
  // Find the recipe itemscope block
  const recipeBlockMatch = html.match(
    /(<[^>]+itemtype=["'][^"']*schema\.org\/Recipe["'][^>]*>[\s\S]*?)(?=<[^>]+itemtype=["'][^"']*schema\.org\/(?!Recipe)[^"']+["']|$)/i
  );
  if (!recipeBlockMatch) return null;

  const block = recipeBlockMatch[1];

  const getProp = (name: string): string => {
    const re = new RegExp(
      `itemprop=["']${name}["'][^>]*(?:content=["']([^"']+)["']|>([^<]+)<)`,
      "i"
    );
    const m = block.match(re);
    const val = m?.[1] ?? m?.[2] ?? "";
    return stripHtml(val).trim();
  };

  const getAllProps = (name: string): string[] => {
    const re = new RegExp(
      `itemprop=["']${name}["'][^>]*(?:content=["']([^"']+)["']|>([^<]+)<)`,
      "gi"
    );
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      const val = stripHtml((m[1] ?? m[2] ?? "").trim());
      if (val) results.push(val);
    }
    return results;
  };

  const title = getProp("name");
  if (!title) return null;

  const rawImage = getProp("image");
  const imageUrl = rawImage && /^https?:\/\//i.test(rawImage) ? rawImage : undefined;

  return {
    title,
    description: getProp("description"),
    ingredients: getAllProps("recipeIngredient"),
    instructions: getAllProps("text").filter(Boolean),
    imageUrl,
    prepTime: parseIsoDuration(getProp("prepTime")),
    cookTime: parseIsoDuration(getProp("cookTime")),
    servings: parseYield(getProp("recipeYield")),
  };
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
        "Cookie": "",
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

  // ── Strategy 1: JSON-LD structured data ───────────────────────────────────
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

  if (recipe) {
    // Parse instructions
    const instructions: string[] = [];
    const rawInstructions = recipe.recipeInstructions;
    if (Array.isArray(rawInstructions)) {
      for (const step of rawInstructions) {
        const text = stripHtml(extractText(step));
        if (text) instructions.push(text);
      }
    } else if (typeof rawInstructions === "string") {
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
      imageUrl:    extractImageUrl(recipe.image),
    });
  }

  // ── Strategy 2: HTML microdata (Schema.org itemtype) ─────────────────────
  const microdata = extractMicrodata(html);
  if (microdata) {
    const ingredients = microdata.ingredients.map((t) => parseIngredientLine(t));
    return NextResponse.json({
      title:        microdata.title,
      description:  microdata.description,
      instructions: microdata.instructions,
      ingredients,
      servings:     microdata.servings,
      prepTime:     microdata.prepTime,
      cookTime:     microdata.cookTime,
      sourceUrl:    url,
      tags:         [] as string[],
      imageUrl:     microdata.imageUrl,
    });
  }

  // ── Strategy 3: Open Graph / meta tags ───────────────────────────────────
  // This gives us at minimum a title, description, and image to pre-fill the
  // form with. Ingredients and instructions will be empty — the user fills
  // those in manually. Better than a hard failure for sites without JSON-LD.
  const meta = extractMetaTags(html);
  if (meta.title) {
    return NextResponse.json({
      title:        meta.title,
      description:  meta.description,
      instructions: [] as string[],
      ingredients:  [] as { name: string; amount: string; unit: string }[],
      servings:     undefined,
      prepTime:     undefined,
      cookTime:     undefined,
      sourceUrl:    url,
      tags:         [] as string[],
      imageUrl:     meta.imageUrl,
      partial:      true,
    });
  }

  // ── Nothing worked ────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      error:
        "No recipe data found on that page. This can happen with sites that load content via JavaScript (like Sainsbury's). Try copying the recipe details manually, or use a site that includes structured recipe data (AllRecipes, BBC Good Food, Serious Eats…).",
    },
    { status: 422 }
  );
}
