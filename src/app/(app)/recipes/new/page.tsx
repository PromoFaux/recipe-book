import { RecipeForm } from "@/components/recipe-form";
import { db } from "@/lib/db";

export default async function NewRecipePage() {
  const allTags = await db.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Recipe</h1>
      <RecipeForm mode="create" allTags={allTags.map((t) => t.name)} />
    </div>
  );
}
