import Link from "next/link";
import Image from "next/image";
import { FolderOpen } from "lucide-react";

interface CoverPhoto {
  filename: string;
  recipeId: string;
}

interface CollectionCardProps {
  id: string;
  name: string;
  description: string | null;
  recipeCount: number;
  coverPhoto: CoverPhoto | null;
}

export function CollectionCard({ id, name, description, recipeCount, coverPhoto }: CollectionCardProps) {
  return (
    <Link
      href={`/collections/${id}`}
      className="group flex flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      <div className="relative aspect-video bg-brand-50 overflow-hidden">
        {coverPhoto ? (
          <Image
            src={`/uploads/${coverPhoto.recipeId}/${coverPhoto.filename}`}
            alt={name}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderOpen size={40} className="text-brand-300" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white font-medium">
          {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  );
}
