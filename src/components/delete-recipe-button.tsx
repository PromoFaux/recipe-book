"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface Props {
  id: string;
  title: string;
}

export function DeleteRecipeButton({ id, title }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 size={14} /> Delete
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Delete recipe?">
        <p className="text-gray-600 text-sm">
          <span className="font-medium text-gray-900">{title}</span> and all its photos will be
          permanently deleted. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
