"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:   "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
      secondary: "bg-brand-100 text-brand-800 hover:bg-brand-200 active:bg-brand-300",
      outline:   "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
      ghost:     "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
      danger:    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
    };

    const sizes = {
      sm:   "h-8 px-3 text-sm",
      md:   "h-10 px-4 text-sm",
      lg:   "h-12 px-6 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
