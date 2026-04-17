"use client";

import { useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateCollectionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      toast.success(`Collection "${created.name}" created`);
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    } catch {
      toast.error("Could not create collection.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
      >
        <Plus size={16} />
        New Collection
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setOpen(false); setName(""); setDescription(""); } }}
          placeholder="Collection name…"
          className="h-9 w-56 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setOpen(false); setName(""); setDescription(""); } }}
          placeholder="Description (optional)…"
          className="h-9 w-56 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={saving || !name.trim()}
        className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 h-9 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Create
      </button>
      <button
        onClick={() => { setOpen(false); setName(""); setDescription(""); }}
        className="rounded-lg border border-gray-200 px-2 h-9 text-gray-500 hover:bg-gray-50"
      >
        <X size={14} />
      </button>
    </div>
  );
}
