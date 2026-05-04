"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type MiniTabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const MiniTabsContext = React.createContext<MiniTabsContextValue | null>(null);

function useMiniTabsContext() {
  const context = React.useContext(MiniTabsContext);
  if (!context) {
    throw new Error("MiniTabs components must be used within <MiniTabs />");
  }

  return context;
}

type MiniTabsProps = {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function MiniTabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: MiniTabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <MiniTabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </MiniTabsContext.Provider>
  );
}

type MiniTabsListProps = {
  className?: string;
  children: React.ReactNode;
};

export function MiniTabsList({ className, children }: MiniTabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-fit items-center gap-1",
        "rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type MiniTabsTriggerProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function MiniTabsTrigger({ value, className, children }: MiniTabsTriggerProps) {
  const { value: currentValue, setValue } = useMiniTabsContext();
  const active = currentValue === value;

  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
        active
          ? "bg-[color:var(--surface)] text-[color:var(--brand-strong)] shadow-[0_4px_8px_rgba(10,20,34,0.12)]"
          : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

type MiniTabsContentProps = {
  value: string;
  className?: string;
  children?: React.ReactNode;
};

export function MiniTabsContent({ value, className, children }: MiniTabsContentProps) {
  const { value: currentValue } = useMiniTabsContext();

  if (currentValue !== value) return null;

  return (
    <div role="tabpanel" className={cn("outline-none", className)}>
      {children}
    </div>
  );
}
