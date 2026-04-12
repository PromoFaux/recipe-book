import Link from "next/link";
import Image from "next/image";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

interface Tag { tag: { name: string } }
interface Photo { filename: string; recipeId: string }
interface Creator { name: string | null; image: string | null }

interface RecipeCardProps {
  id: string;
  title: string;
  description?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  tags: Tag[];
  photos: Photo[];
  createdBy: Creator;
}

export function RecipeCard({
  id, title, description, prepTime, cookTime, servings, tags, photos, createdBy,
}: RecipeCardProps) {
  const totalTime = (prepTime ?? 0) + (cookTime ?? 0);
  const cover = photos[0];

  return (
    <Link href={`/recipes/${id}`} className="group block">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Cover photo */}
        <div className="relative aspect-[4/3] bg-brand-50">
          {cover ? (
            <Image
              src={`/uploads/${cover.recipeId}/${cover.filename}`}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🍽️</div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>
          )}

          {/* Meta */}
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(totalTime)}
              </span>
            )}
            {servings && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {servings}
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, 3).map(({ tag }) => (
                <Badge key={tag.name} variant="brand">{tag.name}</Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline">+{tags.length - 3}</Badge>
              )}
            </div>
          )}

          {/* Creator */}
          <p className="mt-2 text-xs text-gray-400">by {createdBy.name ?? "Unknown"}</p>
        </div>
      </div>
    </Link>
  );
}
