import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-600 text-white",
        secondary:
          "border-transparent bg-muted text-foreground",
        accent:
          "border-transparent bg-accent-500/15 text-accent-600 dark:text-accent-400",
        electric:
          "border-transparent bg-electric-500/15 text-electric-600 dark:text-electric-400",
        destructive:
          "border-transparent bg-red-500/15 text-red-600 dark:text-red-400",
        success:
          "border-transparent bg-green-500/15 text-green-600 dark:text-green-400",
        warning:
          "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        outline:
          "border-border text-foreground",
        // Cohort status badges
        draft:
          "border-transparent bg-gray-500/15 text-gray-600 dark:text-gray-400",
        enrollment_open:
          "border-transparent bg-accent-500/15 text-accent-600 dark:text-accent-400 animate-pulse",
        enrollment_closed:
          "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        active:
          "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400",
        completed:
          "border-transparent bg-green-500/15 text-green-600 dark:text-green-400",
        archived:
          "border-transparent bg-gray-500/15 text-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
