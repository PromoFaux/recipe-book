import { RecipeForm } from "@/components/recipe-form";
import { db } from "@/lib/db";

interface NewRecipePageProps {
  searchParams: Promise<{ share_url?: string }>;
}

export default async function NewRecipePage({ searchParams }: NewRecipePageProps) {
  const { share_url = "" } = await searchParams;
  const allTags = await db.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Recipe</h1>
      <RecipeForm
        mode="create"
        allTags={allTags.map((t) => t.name)}
        initialImportUrl={share_url}
      />
    </div>
  );
}
