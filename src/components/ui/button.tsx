import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary-600 text-white shadow-md hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]",
        accent:
          "bg-accent-500 text-white shadow-md hover:bg-accent-600 hover:shadow-lg active:scale-[0.98]",
        electric:
          "bg-electric-500 text-white shadow-md hover:bg-electric-600 hover:shadow-lg active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-md hover:bg-red-600 hover:shadow-lg active:scale-[0.98]",
        outline:
          "border-2 border-border bg-transparent hover:bg-muted hover:border-primary-400 active:scale-[0.98]",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.98]",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link:
          "text-accent-500 underline-offset-4 hover:underline p-0 h-auto",
        gradient:
          "bg-gradient-to-r from-accent-500 to-electric-500 text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
