"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, X, Search, Loader2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/utils";

interface Photo { filename: string; recipeId: string }
interface Tag { tag: { name: string } }
interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  photos: Photo[];
  tags: Tag[];
}

interface CollectionRecipesManagerProps {
  collectionId: string;
  initialRecipes: Recipe[];
}

export function CollectionRecipesManager({ collectionId, initialRecipes }: CollectionRecipesManagerProps) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [available, setAvailable] = useState<Recipe[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/available-recipes`);
      const data = await res.json();
      setAvailable(data);
    } catch {
      toast.error("Could not load recipes.");
    } finally {
      setPickerLoading(false);
    }
  }, [collectionId]);

  const addRecipe = async (recipe: Recipe) => {
    setAdding(recipe.id);
    try {
      await fetch(`/api/collections/${collectionId}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      setRecipes((prev) => [...prev, recipe]);
      setAvailable((prev) => prev.filter((r) => r.id !== recipe.id));
      router.refresh();
    } catch {
      toast.error("Could not add recipe.");
    } finally {
      setAdding(null);
    }
  };

  const removeRecipe = async (recipeId: string) => {
    setRemoving(recipeId);
    try {
      await fetch(`/api/collections/${collectionId}/recipes?recipeId=${recipeId}`, {
        method: "DELETE",
      });
      const removed = recipes.find((r) => r.id === recipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      if (removed) setAvailable((prev) => [...prev, removed]);
      router.refresh();
    } catch {
      toast.error("Could not remove recipe.");
    } finally {
      setRemoving(null);
    }
  };

  const filtered = available.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openPicker}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus size={14} /> Add recipes
        </button>
      </div>

      {/* Recipe list */}
      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium text-gray-700">No recipes in this collection yet</p>
          <p className="text-sm mt-1">Click "Add recipes" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const cover = recipe.photos[0];
            const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
            return (
              <div key={recipe.id} className="relative group">
                <Link href={`/recipes/${recipe.id}`} className="block h-full">
                  <div className="flex flex-col h-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-[4/3] bg-brand-50 shrink-0">
                      {cover ? (
                        <Image
                          src={`/uploads/${cover.recipeId}/${cover.filename}`}
                          alt={recipe.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">🍽️</div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {recipe.title}
                      </h3>
                      {recipe.description && (
                        <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
                      )}
                      {totalTime > 0 && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} /> {formatDuration(totalTime)}
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="mt-2 ml-3 inline-flex items-center gap-1 text-xs text-gray-400">
                          <Users size={11} /> {recipe.servings}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Remove button — sits over top-right corner */}
                <button
                  onClick={() => removeRecipe(recipe.id)}
                  disabled={removing === recipe.id}
                  title="Remove from collection"
                  className="absolute top-2 right-2 flex items-center justify-center h-7 w-7 rounded-full bg-white/90 shadow border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {removing === recipe.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <X size={13} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add recipes picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add recipes</h2>
              <button
                onClick={() => { setPickerOpen(false); setSearch(""); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search recipes…"
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {pickerLoading ? (
                <div className="flex justify-center py-8 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">
                  {search ? "No recipes match your search." : "All recipes are already in this collection."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((recipe) => {
                    const cover = recipe.photos[0];
                    return (
                      <li key={recipe.id}>
                        <button
                          onClick={() => addRecipe(recipe)}
                          disabled={adding === recipe.id}
                          className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-brand-50 transition-colors text-left disabled:opacity-60"
                        >
                          <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-brand-50">
                            {cover ? (
                              <Image
                                src={`/uploads/${cover.recipeId}/${cover.filename}`}
                                alt={recipe.title}
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-lg">🍽️</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-1 text-sm">{recipe.title}</p>
                            {recipe.description && (
                              <p className="text-xs text-gray-400 line-clamp-1">{recipe.description}</p>
                            )}
                          </div>
                          {adding === recipe.id
                            ? <Loader2 size={15} className="animate-spin text-brand-500 shrink-0" />
                            : <Plus size={15} className="text-brand-500 shrink-0" />
                          }
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
