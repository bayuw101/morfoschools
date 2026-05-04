import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

type InputGroupProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function InputGroup({
  title,
  description,
  children,
  className,
}: InputGroupProps) {
  return (
    <Panel tone="muted" className={cn("p-3 sm:p-3.5 md:p-4", className)}>
      {title ? (
        <div className="mb-2.5 px-1">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-(--muted-foreground) md:text-sm">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-2.5 md:grid-cols-12 md:gap-3">{children}</div>
    </Panel>
  );
}

type InputGroupItemProps = {
  span?: "full" | "half" | "third" | "quarter" | "wide";
  children: ReactNode;
  className?: string;
};

const spanClasses: Record<NonNullable<InputGroupItemProps["span"]>, string> = {
  full: "md:col-span-12",
  wide: "md:col-span-6 lg:col-span-5",
  half: "md:col-span-6",
  third: "md:col-span-4",
  quarter: "md:col-span-3",
};

export function InputGroupItem({
  span = "full",
  children,
  className,
}: InputGroupItemProps) {
  return <div className={cn("md:col-span-12", spanClasses[span], className)}>{children}</div>;
}
