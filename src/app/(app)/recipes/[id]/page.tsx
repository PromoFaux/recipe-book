import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Clock, Users, ExternalLink, Pencil, ChevronLeft } from "lucide-react";
import { IngredientsPanel } from "./ingredients-panel";
import { DeleteRecipeButton } from "@/components/delete-recipe-button";
import { CollectionManager } from "@/components/collection-manager";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      photos: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      createdBy: { select: { name: true, image: true, email: true } },
    },
  });

  if (!recipe) notFound();

  const instructions: string[] = JSON.parse(recipe.instructions || "[]");
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  const dbUser = await db.user.findUnique({ where: { id: session!.user!.id } });
  const preferMetric = dbUser?.preferMetric ?? false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ChevronLeft size={16} /> All recipes
        </Link>
        <div className="flex items-center gap-2">
          <DeleteRecipeButton id={id} title={recipe.title} />
          <Link
            href={`/recipes/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Pencil size={14} /> Edit
          </Link>
        </div>
      </div>

      {/* Cover photo */}
      {recipe.photos.length > 0 && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-brand-50">
          <Image
            src={`/uploads/${recipe.photos[0].recipeId}/${recipe.photos[0].filename}`}
            alt={recipe.title}
            fill
            unoptimized
            className="object-cover"
            priority
            sizes="(max-width: 672px) 100vw, 672px"
          />
        </div>
      )}

      {/* Photo gallery */}
      {recipe.photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {recipe.photos.slice(1).map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={`/uploads/${photo.recipeId}/${photo.filename}`}
                alt={recipe.title}
                fill
                unoptimized
                className="object-cover"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      )}

      {/* Title + meta */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>

        {recipe.description && (
          <p className="mt-2 text-gray-600">{recipe.description}</p>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipe.tags.map(({ tag }) => (
              <Link key={tag.name} href={`/?tag=${encodeURIComponent(tag.name)}`}>
                <Badge variant="brand">{tag.name}</Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          {recipe.prepTime ? (
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-brand-400" />
              Prep: {formatDuration(recipe.prepTime)}
            </span>
          ) : null}
          {recipe.cookTime ? (
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-brand-400" />
              Cook: {formatDuration(recipe.cookTime)}
            </span>
          ) : null}
          {totalTime > 0 && recipe.prepTime && recipe.cookTime ? (
            <span className="flex items-center gap-1.5 font-medium text-gray-800">
              <Clock size={15} className="text-brand-500" />
              Total: {formatDuration(totalTime)}
            </span>
          ) : null}
          {recipe.servings ? (
            <span className="flex items-center gap-1.5">
              <Users size={15} className="text-brand-400" />
              Serves {recipe.servings}
            </span>
          ) : null}
        </div>

        {/* Source */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            <ExternalLink size={12} /> Original recipe
          </a>
        )}

        <p className="mt-2 text-xs text-gray-400">
          Added by {recipe.createdBy.name ?? recipe.createdBy.email}
        </p>
      </div>

      {/* Ingredients — client component for metric toggle */}
      <IngredientsPanel ingredients={recipe.ingredients} defaultMetric={preferMetric} />

      {/* Collections */}
      <CollectionManager recipeId={id} />

      {/* Instructions */}
      {instructions.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
          <ol className="space-y-4">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white text-sm font-semibold">
                  {i + 1}
                </span>
                <p className="text-gray-700 leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
