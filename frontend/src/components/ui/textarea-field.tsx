"use client";

import * as React from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

export interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix"> {
  label: string;
  error?: string;
  helperText?: string;
  prefix?: ReactNode;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      prefix,
      disabled,
      value,
      defaultValue,
      onChange,
      onInput,
      onAnimationStart,
      onFocus,
      onBlur,
      rows = 6,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const initialFilled =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined
          ? String(defaultValue).length > 0
          : false;
    const [hasValue, setHasValue] = React.useState(initialFilled);

    function assignRef(node: HTMLTextAreaElement | null) {
      textareaRef.current = node;

      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }

    function syncFilledStateFromDom(notifyControlledChange = false) {
      const node = textareaRef.current;
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
        onChange({ target: node, currentTarget: node } as React.ChangeEvent<HTMLTextAreaElement>);
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
        multiline
        disabled={disabled}
        error={error}
        helperText={helperText}
        leading={prefix}
      >
        <textarea
          ref={assignRef}
          disabled={disabled}
          rows={rows}
          className={cn(
            "min-h-[148px] w-full resize-y bg-transparent px-4 pb-3.5 pt-8 text-sm font-medium leading-6 text-[color:var(--foreground)] outline-none placeholder:text-transparent",
            prefix && "pl-14",
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
      </FieldShell>
    );
  },
);

TextareaField.displayName = "TextareaField";
