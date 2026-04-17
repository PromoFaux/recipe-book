import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import { EditCollectionControls } from "./edit-collection-controls";
import { CollectionRecipesManager } from "@/components/collection-recipes-manager";

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
        </div>
        <EditCollectionControls id={id} name={collection.name} description={collection.description} />
      </div>

      {/* Recipes — client-managed so add/remove works without full page reload */}
      <CollectionRecipesManager collectionId={id} initialRecipes={recipes} />
    </div>
  );
}
