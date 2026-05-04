import * as React from "react";
import { cn } from "@/lib/cn";

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
  const isControlled = value !== undefined;
  
  const currentValue = isControlled ? value : uncontrolledValue;
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  return (
    <div className={cn("w-full", className)} data-state={currentValue}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && typeof child.type !== "string") {
          return React.cloneElement(child, {
            // @ts-expect-error injecting context via clone
            currentValue,
            onValueChange: handleValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

export function TabsList({ className, children, currentValue, onValueChange }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-[20px] bg-[color:var(--surface-subtle)] p-1 text-[color:var(--muted-foreground)]",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // @ts-expect-error injecting context via clone
            currentValue,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

export function TabsTrigger({
  className,
  value,
  currentValue,
  onValueChange,
  children,
  ...props
}: TabsTriggerProps) {
  const isSelected = value === currentValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange?.(value)}
      className={cn(
        "inline-flex h-full items-center justify-center whitespace-nowrap rounded-[16px] px-6 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm"
          : "hover:bg-[color:var(--surface)]/50 hover:text-[color:var(--foreground)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  currentValue?: string;
}

export function TabsContent({ className, value, currentValue, children, ...props }: TabsContentProps) {
  if (value !== currentValue) return null;
  return (
    <div
      role="tabpanel"
      data-state={value === currentValue ? "active" : "inactive"}
      className={cn("mt-4 focus-visible:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
