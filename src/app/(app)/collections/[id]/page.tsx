import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { RecipesView } from "@/components/recipes-view";
import { ChevronLeft } from "lucide-react";
import { EditCollectionControls } from "./edit-collection-controls";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;

  const collection = await db.collection.findUnique({
    where: { id },
    include: {
      recipes: {
        include: {
          recipe: {
            select: {
              id: true, title: true, description: true,
              prepTime: true, cookTime: true, servings: true,
              updatedAt: true,
              photos: { orderBy: { order: "asc" }, take: 1 },
              tags: { include: { tag: true } },
              createdBy: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      _count: { select: { recipes: true } },
    },
  });

  if (!collection) notFound();

  const recipes = collection.recipes.map((r) => r.recipe);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/collections"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft size={16} /> All collections
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          {collection.description && (
            <p className="mt-1 text-gray-500">{collection.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {collection._count.recipes} recipe{collection._count.recipes !== 1 ? "s" : ""}
          </p>
        </div>
        <EditCollectionControls id={id} name={collection.name} description={collection.description} />
      </div>

      {/* Recipes */}
      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium text-gray-700">No recipes in this collection yet</p>
          <p className="text-sm mt-1">
            Open any recipe and use the Collections section to add it here.
          </p>
        </div>
      ) : (
        <RecipesView recipes={recipes} />
      )}
    </div>
  );
}
