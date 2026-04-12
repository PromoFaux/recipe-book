"use client";

import { useState, useEffect, useMemo } from "react";
import { LayoutGrid, List, ArrowUp, ArrowDown } from "lucide-react";
import { RecipeCard, type RecipeCardProps } from "@/components/recipe-card";

type View = "grid" | "list";
type SortKey = "name" | "time" | "updated";
type SortDir = "asc" | "desc";
type Recipe = Omit<RecipeCardProps, "view">;

const SORT_BUTTONS: { key: SortKey; label: string; defaultDir: SortDir }[] = [
  { key: "name",    label: "Name",     defaultDir: "asc"  },
  { key: "time",    label: "Time",     defaultDir: "asc"  },
  { key: "updated", label: "Modified", defaultDir: "desc" },
];

function sortRecipes(recipes: Recipe[], key: SortKey, dir: SortDir): Recipe[] {
  const asc = dir === "asc";
  return [...recipes].sort((a, b) => {
    switch (key) {
      case "name":
        return asc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      case "time": {
        const ta = (a.prepTime ?? 0) + (a.cookTime ?? 0);
        const tb = (b.prepTime ?? 0) + (b.cookTime ?? 0);
        // Recipes with no time sink to the bottom regardless of direction
        if (ta === 0 && tb === 0) return 0;
        if (ta === 0) return 1;
        if (tb === 0) return -1;
        return asc ? ta - tb : tb - ta;
      }
      case "updated": {
        const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return asc ? diff : -diff;
      }
    }
  });
}

export function RecipesView({ recipes }: { recipes: Recipe[] }) {
  const [view,  setView]  = useState<View>("grid");
  const [sort,  setSort]  = useState<SortKey>("updated");
  const [dir,   setDir]   = useState<SortDir>("desc");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedView = localStorage.getItem("recipe-view");
    const savedSort = localStorage.getItem("recipe-sort");
    const savedDir  = localStorage.getItem("recipe-sort-dir");
    if (savedView === "grid" || savedView === "list") setView(savedView);
    if (savedSort === "name" || savedSort === "time" || savedSort === "updated") setSort(savedSort);
    if (savedDir === "asc" || savedDir === "desc") setDir(savedDir);
    setReady(true);
  }, []);

  function toggleView(next: View) {
    setView(next);
    localStorage.setItem("recipe-view", next);
  }

  function handleSortClick(key: SortKey, defaultDir: SortDir) {
    const nextDir = sort === key ? (dir === "asc" ? "desc" : "asc") : defaultDir;
    setSort(key);
    setDir(nextDir);
    localStorage.setItem("recipe-sort", key);
    localStorage.setItem("recipe-sort-dir", nextDir);
  }

  const sorted = useMemo(() => sortRecipes(recipes, sort, dir), [recipes, sort, dir]);

  // Avoid a flash of wrong layout before localStorage is read
  if (!ready) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Sort buttons */}
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
          {SORT_BUTTONS.map(({ key, label, defaultDir }) => {
            const active = sort === key;
            return (
              <button
                key={key}
                onClick={() => handleSortClick(key, defaultDir)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                  active ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
                {active
                  ? dir === "asc"
                    ? <ArrowUp size={12} />
                    : <ArrowDown size={12} />
                  : <ArrowUp size={12} className="opacity-20" />
                }
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => toggleView("grid")}
            aria-label="Grid view"
            className={`p-2 transition-colors ${view === "grid" ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => toggleView("list")}
            aria-label="List view"
            className={`p-2 transition-colors ${view === "list" ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Recipes */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {sorted.map((recipe) => (
            <RecipeCard key={recipe.id} {...recipe} view="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((recipe) => (
            <RecipeCard key={recipe.id} {...recipe} view="list" />
          ))}
        </div>
      )}
    </div>
  );
}
