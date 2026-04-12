/**
 * US → Metric measurement conversion utilities.
 * Amounts are stored as strings to preserve fractions ("1/2", "1 1/4").
 */

export type Unit = string;

// Units that can be converted to metric
const VOLUME_CONVERSIONS: Record<string, { to: string; factor: number }> = {
  cup:  { to: "ml", factor: 236.588 },
  cups: { to: "ml", factor: 236.588 },
  tbsp: { to: "ml", factor: 14.787 },
  tablespoon: { to: "ml", factor: 14.787 },
  tablespoons: { to: "ml", factor: 14.787 },
  tsp:  { to: "ml", factor: 4.929 },
  teaspoon: { to: "ml", factor: 4.929 },
  teaspoons: { to: "ml", factor: 4.929 },
  "fl oz": { to: "ml", factor: 29.574 },
  "fluid oz": { to: "ml", factor: 29.574 },
  "fluid ounce": { to: "ml", factor: 29.574 },
  "fluid ounces": { to: "ml", factor: 29.574 },
  floz: { to: "ml", factor: 29.574 },
};

const WEIGHT_CONVERSIONS: Record<string, { to: string; factor: number }> = {
  lb:    { to: "g", factor: 453.592 },
  lbs:   { to: "g", factor: 453.592 },
  pound: { to: "g", factor: 453.592 },
  pounds: { to: "g", factor: 453.592 },
  oz:    { to: "g", factor: 28.350 },
  ounce: { to: "g", factor: 28.350 },
  ounces: { to: "g", factor: 28.350 },
};

const ALL_CONVERSIONS = { ...VOLUME_CONVERSIONS, ...WEIGHT_CONVERSIONS };

export const US_UNITS = new Set(Object.keys(ALL_CONVERSIONS));

export function isUsUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return US_UNITS.has(unit.toLowerCase().trim());
}

/** Parse a string amount like "1/2", "1 1/4", "2.5", "3" into a float. */
export function parseAmount(amount: string): number {
  const trimmed = amount.trim();

  // Mixed number: "1 1/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Fraction: "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  return parseFloat(trimmed) || 0;
}

/** Format a float back to a friendly string (rounds to 1 decimal, strips .0) */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
}

export interface ConvertedMeasurement {
  amount: string;
  unit: string;
  converted: boolean;
}

export function convertToMetric(
  amount: string | null | undefined,
  unit: string | null | undefined
): ConvertedMeasurement {
  if (!amount || !unit) return { amount: amount ?? "", unit: unit ?? "", converted: false };

  const unitLower = unit.toLowerCase().trim();
  const conversion = ALL_CONVERSIONS[unitLower];

  if (!conversion) return { amount, unit, converted: false };

  const numericAmount = parseAmount(amount);
  const converted = numericAmount * conversion.factor;

  // Smart formatting: if result >= 1000ml, show in litres; if >= 1000g, show in kg
  let displayAmount = converted;
  let displayUnit = conversion.to;

  if (conversion.to === "ml" && converted >= 1000) {
    displayAmount = converted / 1000;
    displayUnit = "l";
  } else if (conversion.to === "g" && converted >= 1000) {
    displayAmount = converted / 1000;
    displayUnit = "kg";
  }

  return {
    amount: formatNumber(displayAmount),
    unit: displayUnit,
    converted: true,
  };
}

/** Convert a temperature string like "350°F" or "350 F" found in instructions text. */
export function convertTemperaturesInText(text: string): string {
  return text.replace(/(\d+(?:\.\d+)?)\s*°?\s*F\b/g, (_, f) => {
    const celsius = Math.round(((parseFloat(f) - 32) * 5) / 9);
    return `${celsius}°C`;
  });
}

export const UNIT_OPTIONS = [
  { label: "— none —",    value: "" },
  { label: "── Volume (US) ──", value: "", disabled: true },
  { label: "cups",        value: "cups" },
  { label: "tbsp",        value: "tbsp" },
  { label: "tsp",         value: "tsp" },
  { label: "fl oz",       value: "fl oz" },
  { label: "── Weight (US) ──", value: "", disabled: true },
  { label: "lb",          value: "lb" },
  { label: "oz",          value: "oz" },
  { label: "── Volume (metric) ──", value: "", disabled: true },
  { label: "ml",          value: "ml" },
  { label: "l",           value: "l" },
  { label: "── Weight (metric) ──", value: "", disabled: true },
  { label: "g",           value: "g" },
  { label: "kg",          value: "kg" },
  { label: "── Other ──", value: "", disabled: true },
  { label: "pinch",       value: "pinch" },
  { label: "whole",       value: "whole" },
  { label: "slice",       value: "slice" },
  { label: "clove",       value: "clove" },
  { label: "to taste",    value: "to taste" },
];
