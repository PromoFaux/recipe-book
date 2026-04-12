import { db } from "@/lib/db";
import { RecipeCard } from "@/components/recipe-card";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const { q = "", tag = "" } = await searchParams;

  const recipes = await db.recipe.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {},
        tag ? { tags: { some: { tag: { name: tag } } } } : {},
      ],
    },
    include: {
      photos: { orderBy: { order: "asc" }, take: 1 },
      tags: { include: { tag: true } },
      createdBy: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allTags = await db.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/recipes/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Add Recipe
        </Link>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search recipes…"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </form>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !tag ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => (
            <Link
              key={t.id}
              href={tag === t.name ? "/" : `/?tag=${encodeURIComponent(t.name)}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tag === t.name
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="font-medium text-gray-700">No recipes yet</p>
          <p className="text-sm mt-1">
            {q || tag ? "Try a different search." : "Add your first recipe to get started!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} {...recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
