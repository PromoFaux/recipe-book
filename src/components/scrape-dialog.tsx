"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";

interface ScrapeDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: Record<string, unknown>) => void;
}

export function ScrapeDialog({ open, onClose, onImport }: ScrapeDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to import recipe.");
        return;
      }

      onImport(data);
      onClose();
      setUrl("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Import from URL">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Paste a link from a recipe site (AllRecipes, BBC Good Food, Serious Eats, etc.) and
          we&apos;ll try to fill in the recipe for you.
        </p>

        <Input
          placeholder="https://www.allrecipes.com/recipe/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleImport()}
          type="url"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} loading={loading} disabled={!url.trim()}>
            <Link size={16} />
            Import Recipe
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
