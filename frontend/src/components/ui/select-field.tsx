"use client";

import * as React from "react";
import type { FocusEventHandler, ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

export interface SelectFieldProps
{
  label: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  options: Option[];
  startAdornment?: ReactNode;
  className?: string;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  name?: string;
  id?: string;
  required?: boolean;
}

export const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      placeholder = "Choose one",
      options,
      disabled,
      value,
      defaultValue,
      onFocus,
      onBlur,
      onChange,
      startAdornment,
      name,
      id,
      required,
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      defaultValue !== undefined ? String(defaultValue) : "",
    );
    const [open, setOpen] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
      if (!open) return;

      function handlePointerDown(event: MouseEvent) {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
          setFocused(false);
        }
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false);
          setFocused(false);
          buttonRef.current?.focus();
        }
      }

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    const currentValue = isControlled ? String(value ?? "") : internalValue;
    const selectedOption = options.find((option) => option.value === currentValue);
    const hasValue = currentValue.length > 0;
    const displayLabel = hasValue ? selectedOption?.label ?? "" : open ? placeholder : "";

    function assignRef(node: HTMLButtonElement | null) {
      buttonRef.current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function emitChange(nextValue: string) {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onChange?.({
        target: {
          value: nextValue,
          name: name ?? "",
          id: id ?? "",
        },
        currentTarget: {
          value: nextValue,
          name: name ?? "",
          id: id ?? "",
        },
      } as React.ChangeEvent<HTMLSelectElement>);
    }

    return (
      <div ref={rootRef} className={cn("w-full", className)}>
        {name ? <input type="hidden" name={name} value={currentValue} required={required} /> : null}

        <FieldShell
          label={label}
          active={open || focused}
          filled={open || focused || hasValue}
          disabled={disabled}
          error={error}
          helperText={helperText}
          leading={startAdornment}
          suffix={
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
            />
          }
        >
          <button
            id={id}
            ref={assignRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => {
              setOpen((previousValue) => {
                const nextOpen = !previousValue;
                setFocused(nextOpen);
                return nextOpen;
              });
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              if (!open) {
                setFocused(false);
              }
              onBlur?.(event);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(true);
                setFocused(true);
              }
            }}
            className={cn(
              "h-[58px] w-full bg-transparent px-4 pb-2.5 pt-7 text-left text-sm font-semibold text-[color:var(--foreground)] outline-none",
              startAdornment && "pl-16",
              "pr-16",
            )}
          >
            <span className={cn("block truncate", !hasValue && "text-[color:var(--muted-foreground)]")}>
              {displayLabel}
            </span>
          </button>

          {open ? (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-[22px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-2 shadow-[0_26px_54px_rgba(9,17,28,0.18)]">
              <div role="listbox" className="max-h-64 space-y-1 overflow-auto">
                {options.map((option) => {
                  const isSelected = option.value === currentValue;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return;
                        emitChange(option.value);
                        setOpen(false);
                        setFocused(false);
                        buttonRef.current?.focus();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[16px] px-3.5 py-3 text-left transition-colors",
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : isSelected
                            ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                            : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">{option.label}</p>
                      </div>
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-xl border transition-colors",
                          isSelected
                            ? "border-[color:var(--brand)] bg-[color:var(--surface)] text-[color:var(--brand-strong)]"
                            : "border-transparent text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </FieldShell>
      </div>
    );
  },
);

SelectField.displayName = "SelectField";
