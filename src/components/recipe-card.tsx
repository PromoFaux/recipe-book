import Link from "next/link";
import Image from "next/image";
import { Clock, Users, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

interface Tag { tag: { name: string } }
interface Photo { filename: string; recipeId: string }
interface Creator { name: string | null; image: string | null }

export interface RecipeCardProps {
  id: string;
  title: string;
  description?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  updatedAt: Date;
  tags: Tag[];
  photos: Photo[];
  createdBy: Creator;
  view?: "grid" | "list";
}

export function RecipeCard({
  id, title, description, prepTime, cookTime, servings, updatedAt, tags, photos, createdBy, view = "grid",
}: RecipeCardProps) {
  const totalTime = (prepTime ?? 0) + (cookTime ?? 0);
  const cover = photos[0];

  if (view === "list") {
    return (
      <Link href={`/recipes/${id}`} className="group block">
        <div className="flex gap-4 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow p-3">
          {/* Thumbnail */}
          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-brand-50">
            {cover ? (
              <Image
                src={`/uploads/${cover.recipeId}/${cover.filename}`}
                alt={title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="96px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 min-w-0 justify-center">
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {totalTime > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {formatDuration(totalTime)}
                </span>
              )}
              {servings && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />
                  {servings}
                </span>
              )}
              {tags.slice(0, 3).map(({ tag }) => (
                <Badge key={tag.name} variant="brand">{tag.name}</Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline">+{tags.length - 3}</Badge>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>by {createdBy.name ?? "Unknown"}</span>
              <span className="flex items-center gap-1 shrink-0">
                <CalendarDays size={11} />
                {formatDate(updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/recipes/${id}`} className="group flex h-full">
      <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Cover photo */}
        <div className="relative aspect-[4/3] bg-brand-50 shrink-0">
          {cover ? (
            <Image
              src={`/uploads/${cover.recipeId}/${cover.filename}`}
              alt={title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🍽️</div>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {title}
          </h3>

          {/* Always reserve 2 lines for description so meta aligns across cards */}
          <p className="mt-1 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
            {description ?? ""}
          </p>

          {/* Spacer pushes meta/tags/creator to the bottom */}
          <div className="flex-1" />

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
          <div className="mt-2 flex flex-wrap gap-1 min-h-[1.5rem]">
            {tags.slice(0, 3).map(({ tag }) => (
              <Badge key={tag.name} variant="brand">{tag.name}</Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline">+{tags.length - 3}</Badge>
            )}
          </div>

          {/* Creator + modified date */}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
            <span>by {createdBy.name ?? "Unknown"}</span>
            <span className="flex items-center gap-1 shrink-0">
              <CalendarDays size={11} />
              {formatDate(updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
