import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 tracking-normal transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[oklch(82%_0.045_255)] bg-[oklch(96%_0.018_255)] text-[oklch(38%_0.09_255)]",
        shell: "border-white/[0.14] bg-white/[0.08] text-white/82",
        success:
          "border-[oklch(82%_0.075_150)] bg-[oklch(96%_0.035_150)] text-[oklch(37%_0.12_150)]",
        warning:
          "border-[oklch(84%_0.09_78)] bg-[oklch(97%_0.04_78)] text-[oklch(42%_0.13_68)]",
        danger:
          "border-[oklch(82%_0.09_26)] bg-[oklch(96%_0.035_26)] text-[oklch(42%_0.16_26)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
