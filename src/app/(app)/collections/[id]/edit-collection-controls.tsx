"use client";

import { useState } from "react";
import { Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EditCollectionControlsProps {
  id: string;
  name: string;
  description: string | null;
}

export function EditCollectionControls({ id, name, description }: EditCollectionControlsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDesc, setEditDesc] = useState(description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Collection updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Could not update collection.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Collection deleted");
      router.push("/collections");
    } catch {
      toast.error("Could not delete collection.");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 min-w-0 w-64">
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <input
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
          placeholder="Description (optional)…"
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            disabled={saving || !editName.trim()}
            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-gray-500 hover:bg-gray-50"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Pencil size={14} /> Edit
      </button>
      {confirmDelete ? (
        <>
          <span className="text-sm text-gray-500">Delete?</span>
          <button
            onClick={deleteCollection}
            disabled={deleting}
            className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
            Yes, delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-gray-500 hover:bg-gray-50"
          >
            <X size={13} />
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}
