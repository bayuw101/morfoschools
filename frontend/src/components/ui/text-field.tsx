"use client";

import * as React from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  label: string;
  valid?: boolean;
  error?: string;
  helperText?: string;
  suffix?: ReactNode;
  prefix?: ReactNode;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className,
      label,
      valid,
      error,
      helperText,
      suffix,
      prefix,
      disabled,
      value,
      defaultValue,
      onChange,
      onInput,
      onAnimationStart,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const initialFilled =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined
          ? String(defaultValue).length > 0
          : false;
    const [hasValue, setHasValue] = React.useState(initialFilled);

    function assignRef(node: HTMLInputElement | null) {
      inputRef.current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function syncFilledStateFromDom(notifyControlledChange = false) {
      const node = inputRef.current;
      if (!node) {
        return;
      }

      const nextValue = node.value;
      setHasValue(nextValue.length > 0);

      if (
        notifyControlledChange &&
        onChange &&
        value !== undefined &&
        String(value ?? "") !== nextValue
      ) {
        onChange({ target: node, currentTarget: node } as React.ChangeEvent<HTMLInputElement>);
      }
    }

    React.useEffect(() => {
      if (value !== undefined) {
        setHasValue(String(value).length > 0);
      }

      const frameId = window.requestAnimationFrame(() => {
        syncFilledStateFromDom(true);
      });
      const timeoutId = window.setTimeout(() => {
        syncFilledStateFromDom(true);
      }, 150);

      return () => {
        window.cancelAnimationFrame(frameId);
        window.clearTimeout(timeoutId);
      };
    }, [onChange, value]);

    return (
      <FieldShell
        label={label}
        active={focused}
        filled={focused || hasValue}
        disabled={disabled}
        valid={valid}
        error={error}
        helperText={helperText}
        leading={prefix}
        suffix={suffix}
      >
        <div className="flex items-stretch">
          <input
            ref={assignRef}
            disabled={disabled}
            className={cn(
              "h-[58px] w-full bg-transparent px-4 pb-2.5 pt-7 text-sm font-semibold text-[color:var(--foreground)] outline-none placeholder:text-transparent",
              prefix && "pl-16",
              (suffix || valid) && "pr-16",
              className,
            )}
            placeholder=" "
            value={value}
            defaultValue={defaultValue}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            onChange={(event) => {
              setHasValue(event.target.value.length > 0);
              onChange?.(event);
            }}
            onInput={(event) => {
              setHasValue(event.currentTarget.value.length > 0);
              onInput?.(event);
            }}
            onAnimationStart={(event) => {
              if (event.animationName === "field-autofill-start") {
                syncFilledStateFromDom(true);
              }

              if (event.animationName === "field-autofill-cancel") {
                syncFilledStateFromDom(false);
              }

              onAnimationStart?.(event);
            }}
            {...props}
          />
        </div>
      </FieldShell>
    );
  },
);

TextField.displayName = "TextField";
