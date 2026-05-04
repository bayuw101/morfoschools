import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--brand)] px-4 py-2.5 text-white shadow-[0_16px_30px_rgba(38,76,131,0.18)] hover:bg-[color:var(--brand-strong)]",
        secondary:
          "border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2.5 text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]",
        danger:
          "bg-[color:var(--danger)] px-4 py-2.5 text-white shadow-[0_16px_30px_rgba(120,42,42,0.16)] hover:opacity-92",
        ghost:
          "px-3 py-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
