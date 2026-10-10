import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({
  className,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Loader2
        className={cn(
          "animate-spin text-accent-500",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-xl border border-border p-6 space-y-4">
      <div className="h-4 w-3/4 rounded shimmer" />
      <div className="h-3 w-1/2 rounded shimmer" />
      <div className="h-20 w-full rounded shimmer" />
    </div>
  );
}
