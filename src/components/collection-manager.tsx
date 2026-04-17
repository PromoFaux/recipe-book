"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Plus, Check, Loader2, X, FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isMember: boolean;
  _count: { recipes: number };
}

interface CollectionManagerProps {
  recipeId: string;
}

export function CollectionManager({ recipeId }: CollectionManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch(`/api/collections?recipeId=${recipeId}`)
      .then((r) => r.json())
      .then(setCollections)
      .finally(() => setLoading(false));
  }, [recipeId]);

  const toggle = async (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;
    setToggling(collectionId);

    try {
      if (collection.isMember) {
        await fetch(`/api/collections/${collectionId}/recipes?recipeId=${recipeId}`, {
          method: "DELETE",
        });
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, isMember: false, _count: { recipes: c._count.recipes - 1 } }
              : c
          )
        );
      } else {
        await fetch(`/api/collections/${collectionId}/recipes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId }),
        });
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId
              ? { ...c, isMember: true, _count: { recipes: c._count.recipes + 1 } }
              : c
          )
        );
      }
    } catch {
      toast.error("Could not update collection.");
    } finally {
      setToggling(null);
    }
  };

  const createCollection = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      const created: Collection = await res.json();
      // Immediately add this recipe to the new collection
      await fetch(`/api/collections/${created.id}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      setCollections((prev) => [
        ...prev,
        { ...created, isMember: true, _count: { recipes: 1 } },
      ]);
      setNewName("");
      setShowCreate(false);
      toast.success(`Added to "${created.name}"`);
    } catch {
      toast.error("Could not create collection.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen size={20} className="text-brand-500" />
          Collections
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          <FolderPlus size={14} />
          New collection
        </button>
      </div>

      {/* Create new collection inline form */}
      {showCreate && (
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createCollection();
              if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
            }}
            placeholder="Collection name…"
            className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            onClick={createCollection}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName(""); }}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-gray-500 hover:bg-gray-50"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : collections.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          No collections yet.{" "}
          <button onClick={() => setShowCreate(true)} className="text-brand-600 hover:underline">
            Create one
          </button>{" "}
          to organise your recipes.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => {
            const isToggling = toggling === c.id;
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={isToggling}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors disabled:opacity-60 ${
                  c.isMember
                    ? "bg-brand-500 text-white hover:bg-brand-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isToggling ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : c.isMember ? (
                  <Check size={12} />
                ) : (
                  <Plus size={12} />
                )}
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
