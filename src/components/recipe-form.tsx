"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GripVertical, Plus, Trash2, Link as LinkIcon, Upload, X, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { ScrapeDialog } from "@/components/scrape-dialog";
import { UNIT_OPTIONS } from "@/lib/measurements";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const ingredientSchema = z.object({
  name: z.string().min(1, "Required"),
  amount: z.string().default(""),
  unit: z.string().default(""),
  notes: z.string().default(""),
  order: z.number().default(0),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  prepTime: z.coerce.number().int().nonnegative().optional().nullable(),
  cookTime: z.coerce.number().int().nonnegative().optional().nullable(),
  servings: z.coerce.number().int().positive().optional().nullable(),
  sourceUrl: z.string().default(""),
  instructions: z.array(z.object({ step: z.string() })),
  ingredients: z.array(ingredientSchema),
  tags: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RecipeFormProps {
  recipeId?: string;
  defaultValues?: Partial<FormValues>;
  existingPhotos?: { id: string; filename: string; recipeId: string }[];
  allTags?: string[];
  mode: "create" | "edit";
  initialImportUrl?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RecipeForm({
  recipeId,
  defaultValues,
  existingPhotos = [],
  allTags = [],
  mode,
  initialImportUrl = "",
}: RecipeFormProps) {
  const router = useRouter();
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [photos, setPhotos] = useState(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharedImportStatus, setSharedImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle");
  const [sharedImportMessage, setSharedImportMessage] = useState("");
  const didAutoImportRef = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof formSchema>, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: [{ step: "" }],
      ingredients: [{ name: "", amount: "", unit: "", notes: "", order: 0 }],
      tags: [],
      ...defaultValues,
    },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient, move: moveIngredient } =
    useFieldArray({ control, name: "ingredients" });

  const { fields: stepFields, append: appendStep, remove: removeStep, move: moveStep } =
    useFieldArray({ control, name: "instructions" });

  const tags = watch("tags");

  // -------------------------------------------------------------------------
  // Photo upload
  // -------------------------------------------------------------------------
  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      if (!recipeId && mode === "edit") return;

      // For new recipes, we need to save first — handled below in onSubmit
      if (mode === "create") {
        toast.info("Save the recipe first, then add photos.");
        return;
      }

      setUploading(true);
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("recipeId", recipeId!);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (res.ok) {
            const photo = await res.json();
            setPhotos((prev) => [...prev, photo]);
          } else {
            toast.error("Failed to upload photo.");
          }
        } catch {
          toast.error("Upload error.");
        }
      }
      setUploading(false);
      e.target.value = "";
    },
    [recipeId, mode]
  );

  const deletePhoto = async (photoId: string) => {
    const res = await fetch(`/api/upload?id=${photoId}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      toast.error("Failed to delete photo.");
    }
  };

  // -------------------------------------------------------------------------
  // Scrape import
  // -------------------------------------------------------------------------
  const handleImport = (data: Record<string, unknown>) => {
    if (data.title) setValue("title", data.title as string);
    if (data.description) setValue("description", data.description as string);
    if (data.prepTime) setValue("prepTime", data.prepTime as number);
    if (data.cookTime) setValue("cookTime", data.cookTime as number);
    if (data.servings) setValue("servings", data.servings as number);
    if (data.sourceUrl) setValue("sourceUrl", data.sourceUrl as string);
    if (Array.isArray(data.instructions) && data.instructions.length > 0) {
      setValue("instructions", (data.instructions as string[]).map((s) => ({ step: s })));
    }
    if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
      const ings = (data.ingredients as { name: string; amount?: string; unit?: string }[]).map(
        (i, idx) => ({ name: i.name, amount: i.amount ?? "", unit: i.unit ?? "", notes: "", order: idx })
      );
      setValue("ingredients", ings);
    }
    toast.success("Recipe imported! Check the details and save.");
  };

  useEffect(() => {
    const importFromSharedUrl = async () => {
      const url = initialImportUrl.trim();
      if (!url || mode !== "create" || didAutoImportRef.current) return;
      didAutoImportRef.current = true;
      setValue("sourceUrl", url);
      setSharedImportStatus("importing");
      setSharedImportMessage("Shared link received. Importing recipe details...");

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();
        if (!res.ok) {
          setSharedImportStatus("error");
          setSharedImportMessage(data.error ?? "Could not import from shared link.");
          toast.error(data.error ?? "Could not import from shared link.");
          return;
        }

        handleImport(data);
        setSharedImportStatus("success");
        setSharedImportMessage("Shared link imported. Review details and save.");
      } catch {
        setSharedImportStatus("error");
        setSharedImportMessage("Network error while importing shared link.");
        toast.error("Network error while importing shared link.");
      }
    };

    void importFromSharedUrl();
  }, [initialImportUrl, mode, setValue]);

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        instructions: values.instructions.map((s) => s.step).filter(Boolean),
        ingredients: values.ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({ ...i, order: idx })),
      };

      const url = mode === "edit" ? `/api/recipes/${recipeId}` : "/api/recipes";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.error("Failed to save recipe.");
        return;
      }

      const saved = await res.json();
      toast.success(mode === "edit" ? "Recipe updated!" : "Recipe created!");
      router.push(`/recipes/${saved.id}`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
      <ScrapeDialog open={scrapeOpen} onClose={() => setScrapeOpen(false)} onImport={handleImport} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {sharedImportStatus !== "idle" && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              sharedImportStatus === "importing"
                ? "bg-blue-50 text-blue-800"
                : sharedImportStatus === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {sharedImportMessage}
          </div>
        )}

        {/* Import button */}
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setScrapeOpen(true)}>
            <LinkIcon size={14} />
            Import from URL
          </Button>
        </div>

        {/* ── Basic info ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Info</h2>

          <Input
            label="Title *"
            error={errors.title?.message}
            {...register("title")}
          />

          <Textarea
            label="Description"
            rows={2}
            placeholder="A brief description of the dish…"
            {...register("description")}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input label="Prep (mins)" type="number" min={0} {...register("prepTime")} />
            <Input label="Cook (mins)" type="number" min={0} {...register("cookTime")} />
            <Input label="Servings"   type="number" min={1} {...register("servings")} />
          </div>

          <Input
            label="Source URL"
            type="url"
            placeholder="https://…"
            {...register("sourceUrl")}
          />
        </section>

        {/* ── Ingredients ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900">Ingredients</h2>

          <div className="space-y-2">
            {ingredientFields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-2">
                {/* Drag handle (visual only) */}
                <button type="button" className="mt-2 text-gray-300 cursor-grab">
                  <GripVertical size={16} />
                </button>

                {/* Amount */}
                <input
                  {...register(`ingredients.${i}.amount`)}
                  placeholder="Qty"
                  className="h-10 w-16 shrink-0 rounded-lg border border-gray-300 px-2 text-sm focus:border-brand-500 focus:outline-none"
                />

                {/* Unit */}
                <select
                  {...register(`ingredients.${i}.unit`)}
                  className="h-10 w-24 shrink-0 rounded-lg border border-gray-300 px-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value + opt.label} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Name */}
                <div className="flex-1">
                  <input
                    {...register(`ingredients.${i}.name`)}
                    placeholder="Ingredient name *"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  {errors.ingredients?.[i]?.name && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.ingredients[i]?.name?.message}</p>
                  )}
                </div>

                {/* Notes */}
                <input
                  {...register(`ingredients.${i}.notes`)}
                  placeholder="(e.g. chopped)"
                  className="h-10 hidden sm:block w-28 shrink-0 rounded-lg border border-gray-300 px-2 text-sm focus:border-brand-500 focus:outline-none"
                />

                {/* Move up/down */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => i > 0 && moveIngredient(i, i - 1)}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    disabled={i === 0}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => i < ingredientFields.length - 1 && moveIngredient(i, i + 1)}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
                    disabled={i === ingredientFields.length - 1}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="mt-1.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendIngredient({ name: "", amount: "", unit: "", notes: "", order: ingredientFields.length })}
          >
            <Plus size={14} /> Add Ingredient
          </Button>
        </section>

        {/* ── Instructions ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900">Instructions</h2>

          <div className="space-y-2">
            {stepFields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-2">
                <span className="mt-2.5 w-6 shrink-0 text-center text-sm font-semibold text-brand-500">
                  {i + 1}
                </span>

                <textarea
                  {...register(`instructions.${i}.step`)}
                  rows={2}
                  placeholder={`Step ${i + 1}…`}
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />

                <div className="flex flex-col gap-0.5 mt-1">
                  <button type="button" onClick={() => i > 0 && moveStep(i, i - 1)} className="text-gray-400 hover:text-gray-600" disabled={i === 0}>
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => i < stepFields.length - 1 && moveStep(i, i + 1)} className="text-gray-400 hover:text-gray-600" disabled={i === stepFields.length - 1}>
                    <ChevronDown size={14} />
                  </button>
                </div>

                <button type="button" onClick={() => removeStep(i)} className="mt-2 text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => appendStep({ step: "" })}>
            <Plus size={14} /> Add Step
          </Button>
        </section>

        {/* ── Tags ─────────────────────────────────────────────────── */}
        <section>
          <TagInput
            value={tags}
            onChange={(t) => setValue("tags", t)}
            suggestions={allTags}
          />
        </section>

        {/* ── Photos ───────────────────────────────────────────────── */}
        {mode === "edit" && (
          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Photos</h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                  <Image
                    src={`/uploads/${photo.recipeId}/${photo.filename}`}
                    alt="Recipe photo"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="150px"
                  />
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 hover:text-brand-500 transition-colors">
                <Upload size={20} />
                <span className="text-xs">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
          </section>
        )}

        {mode === "create" && (
          <p className="text-sm text-gray-500 bg-amber-50 rounded-lg px-4 py-3">
            💡 Photos can be added after saving the recipe.
          </p>
        )}

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {mode === "edit" ? "Save Changes" : "Create Recipe"}
          </Button>
        </div>
      </form>
    </>
  );
}
