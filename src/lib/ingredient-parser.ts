const FRACTION_REPLACEMENTS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const UNIT_ALIASES: Array<{ alias: string; value: string }> = [
  { alias: "fluid ounces", value: "fl oz" },
  { alias: "fluid ounce", value: "fl oz" },
  { alias: "fl oz", value: "fl oz" },
  { alias: "kilograms", value: "kg" },
  { alias: "kilogram", value: "kg" },
  { alias: "kg", value: "kg" },
  { alias: "grams", value: "g" },
  { alias: "gram", value: "g" },
  { alias: "g", value: "g" },
  { alias: "millilitres", value: "ml" },
  { alias: "millilitre", value: "ml" },
  { alias: "milliliters", value: "ml" },
  { alias: "milliliter", value: "ml" },
  { alias: "ml", value: "ml" },
  { alias: "litres", value: "l" },
  { alias: "litre", value: "l" },
  { alias: "liters", value: "l" },
  { alias: "liter", value: "l" },
  { alias: "l", value: "l" },
  { alias: "tablespoons", value: "tbsp" },
  { alias: "tablespoon", value: "tbsp" },
  { alias: "tbsp", value: "tbsp" },
  { alias: "teaspoons", value: "tsp" },
  { alias: "teaspoon", value: "tsp" },
  { alias: "tsp", value: "tsp" },
  { alias: "cups", value: "cups" },
  { alias: "cup", value: "cups" },
  { alias: "pounds", value: "lb" },
  { alias: "pound", value: "lb" },
  { alias: "lbs", value: "lb" },
  { alias: "lb", value: "lb" },
  { alias: "ounces", value: "oz" },
  { alias: "ounce", value: "oz" },
  { alias: "oz", value: "oz" },
  { alias: "cloves", value: "clove" },
  { alias: "clove", value: "clove" },
  { alias: "slices", value: "slice" },
  { alias: "slice", value: "slice" },
  { alias: "pinches", value: "pinch" },
  { alias: "pinch", value: "pinch" },
  { alias: "whole", value: "whole" },
].sort((left, right) => right.alias.length - left.alias.length);

export interface ParsedIngredient {
  name: string;
  amount: string;
  unit: string;
}

function normalizeIngredientText(input: string): string {
  let text = input.trim().replace(/\u00A0/g, " ");

  for (const [fraction, replacement] of Object.entries(FRACTION_REPLACEMENTS)) {
    text = text.replaceAll(fraction, ` ${replacement}`);
  }

  text = text.replace(/[–—]/g, "-");
  text = text.replace(/\b(\d+)(\d)\/(\d)\b/g, "$1 $2/$3");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function extractUnit(rest: string): { unit: string; remainder: string } {
  const lower = rest.toLowerCase();

  for (const { alias, value } of UNIT_ALIASES) {
    if (!lower.startsWith(alias)) continue;

    const boundary = rest.charAt(alias.length);
    if (boundary && /[A-Za-z]/.test(boundary)) continue;

    return {
      unit: value,
      remainder: rest.slice(alias.length).trim(),
    };
  }

  return { unit: "", remainder: rest };
}

export function parseIngredientLine(input: string): ParsedIngredient {
  const original = input.trim();
  const text = normalizeIngredientText(original);

  if (!text) {
    return { name: "", amount: "", unit: "" };
  }

  const amountMatch = text.match(
    /^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:to|-)+\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?)/i
  );

  if (!amountMatch) {
    return { name: text, amount: "", unit: "" };
  }

  const amount = amountMatch[1].replace(/\s*-\s*/g, "-").trim();
  let remainder = text.slice(amountMatch[0].length).trim();

  remainder = remainder.replace(/^\(([^)]*)\)\s*/, "");

  const { unit, remainder: afterUnit } = extractUnit(remainder);
  remainder = afterUnit;

  if (remainder.toLowerCase().startsWith("of ")) {
    remainder = remainder.slice(3).trim();
  }

  if (!remainder) {
    remainder = unit ? original.slice(amountMatch[0].length).trim() : text;
  }

  return {
    name: remainder.replace(/^[-,;:\s]+/, "").trim() || text,
    amount,
    unit,
  };
}
