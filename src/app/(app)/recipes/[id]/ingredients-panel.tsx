"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { convertToMetric, isUsUnit } from "@/lib/measurements";

interface Ingredient {
  id: string;
  name: string;
  amount: string | null;
  unit: string | null;
  notes: string | null;
}

interface Props {
  ingredients: Ingredient[];
  defaultMetric: boolean;
}

export function IngredientsPanel({ ingredients, defaultMetric }: Props) {
  const [useMetric, setUseMetric] = useState(defaultMetric);

  const hasConvertible = ingredients.some((i) => isUsUnit(i.unit));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Ingredients</h2>
        {hasConvertible && (
          <Switch
            checked={useMetric}
            onCheckedChange={setUseMetric}
            label={useMetric ? "Metric" : "US cups"}
          />
        )}
      </div>

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {ingredients.map((ing) => {
          const converted = useMetric ? convertToMetric(ing.amount, ing.unit) : null;
          const displayAmount = converted?.converted ? converted.amount : (ing.amount ?? "");
          const displayUnit = converted?.converted ? converted.unit : (ing.unit ?? "");

          return (
            <li key={ing.id} className="flex items-baseline gap-2 px-4 py-2.5 text-sm">
              <span className="shrink-0 font-medium text-brand-600 min-w-[3rem] text-right">
                {displayAmount}
              </span>
              <span className="shrink-0 text-gray-500 w-10">{displayUnit}</span>
              <span className="text-gray-800">
                {ing.name}
                {ing.notes && <span className="text-gray-400 ml-1">({ing.notes})</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
