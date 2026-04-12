import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "brand" | "outline";
  className?: string;
  onClick?: () => void;
}

export function Badge({ children, variant = "default", className, onClick }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    brand:   "bg-brand-100 text-brand-700",
    outline: "border border-gray-300 text-gray-600",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
    >
      {children}
    </span>
  );
}
