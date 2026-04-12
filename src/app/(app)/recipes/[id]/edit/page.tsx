import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecipeForm } from "@/components/recipe-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;

  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      photos: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe) notFound();

  const allTags = await db.tag.findMany({ orderBy: { name: "asc" } });

  const instructions: string[] = JSON.parse(recipe.instructions || "[]");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Recipe</h1>
      <RecipeForm
        mode="edit"
        recipeId={id}
        allTags={allTags.map((t) => t.name)}
        existingPhotos={recipe.photos.map((p) => ({
          id: p.id,
          filename: p.filename,
          recipeId: p.recipeId,
        }))}
        defaultValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          sourceUrl: recipe.sourceUrl ?? "",
          instructions: instructions.map((s) => ({ step: s })),
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            amount: i.amount ?? "",
            unit: i.unit ?? "",
            notes: i.notes ?? "",
            order: i.order,
          })),
          tags: recipe.tags.map(({ tag }) => tag.name),
        }}
      />
    </div>
  );
}
