import { db } from "@/lib/db";
import { CollectionCard } from "@/components/collection-card";
import { CreateCollectionButton } from "@/components/create-collection-button";

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    include: {
      recipes: {
        include: {
          recipe: {
            include: { photos: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
        orderBy: { addedAt: "asc" },
        take: 1,
      },
      _count: { select: { recipes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CreateCollectionButton />
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📁</div>
          <p className="font-medium text-gray-700">No collections yet</p>
          <p className="text-sm mt-1">
            Create a collection to organise your recipes into groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((c) => {
            const firstRecipe = c.recipes[0]?.recipe;
            const coverPhoto = firstRecipe?.photos[0]
              ? { filename: firstRecipe.photos[0].filename, recipeId: firstRecipe.id }
              : null;
            return (
              <CollectionCard
                key={c.id}
                id={c.id}
                name={c.name}
                description={c.description}
                recipeCount={c._count.recipes}
                coverPhoto={coverPhoto}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
