"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ value, onChange, suggestions = [], placeholder = "Add tag…" }: TagInputProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  const add = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      add(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Tags</label>
      <div
        className={cn(
          "min-h-10 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text",
          focused && "border-brand-500 ring-2 ring-brand-500/20"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-brand-900">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Suggestions dropdown */}
      {focused && input && filtered.length > 0 && (
        <div className="relative">
          <ul className="absolute top-0 z-10 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(s); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 text-gray-700"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400">Press Enter or comma to add</p>
    </div>
  );
}
