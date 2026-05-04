"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

type DateStepperProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  helperText?: string;
  className?: string;
  formatDisplay?: (dateString: string) => string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cloneDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateString(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return cloneDate(parsed);
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function sameDate(first: Date | null, second: Date | null) {
  if (!first || !second) {
    return false;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function buildCalendarDays(currentMonth: Date) {
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const days: Array<Date | null> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  return days;
}

export function DateStepper({
  label,
  value,
  onChange,
  min,
  max,
  helperText,
  className,
  formatDisplay = (nextValue) => nextValue,
}: DateStepperProps) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const selectedDate = React.useMemo(() => parseDateString(value), [value]);
  const minDate = React.useMemo(() => (min ? parseDateString(min) : null), [min]);
  const maxDate = React.useMemo(() => (max ? parseDateString(max) : null), [max]);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selectedDate ?? new Date());

  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

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

  const isMin = min ? value <= min : false;
  const isMax = max ? value >= max : false;
  const calendarDays = React.useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const handleStep = (direction: -1 | 1) => {
    const current = parseDateString(value);
    if (!current) {
      return;
    }

    current.setDate(current.getDate() + direction);
    const nextDateKey = formatDateKey(current);

    if (direction === -1 && min && nextDateKey < min) {
      return;
    }

    if (direction === 1 && max && nextDateKey > max) {
      return;
    }

    onChange(nextDateKey);
  };

  const isDisabledDate = (date: Date) => {
    if (minDate && date < minDate) {
      return true;
    }

    if (maxDate && date > maxDate) {
      return true;
    }

    return false;
  };

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <FieldShell
        label={label ?? ""}
        active={open || focused}
        filled
        helperText={helperText ?? ""}
      >
        <div className="relative grid grid-cols-[44px_minmax(0,1fr)_44px] items-center overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] transition focus-within:border-[color:var(--border-strong)]">
          <button
            type="button"
            disabled={isMin}
            onClick={() => handleStep(-1)}
            aria-label="Previous day"
            className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-subtle)] disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => {
              setOpen((current) => !current);
              setFocused(true);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              if (!open) {
                setFocused(false);
              }
            }}
            className="relative flex h-11 min-w-0 items-center justify-center border-l border-r border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-10 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface)]"
          >
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            <span className="pointer-events-none">{formatDisplay(value)}</span>
            <ChevronDown
              className={cn(
                "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)] transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>

          <button
            type="button"
            disabled={isMax}
            onClick={() => handleStep(1)}
            aria-label="Next day"
            className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-subtle)] disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_30px_62px_rgba(9,17,28,0.2)]">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                      )
                    }
                    aria-label="Previous month"
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 text-center">
                    <span>{MONTHS[currentMonth.getMonth()]}</span>
                    <span className="ml-1">{currentMonth.getFullYear()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                      )
                    }
                    aria-label="Next month"
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setFocused(false);
                    buttonRef.current?.focus();
                  }}
                  className="relative z-10 shrink-0 text-xs font-semibold text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
                <div className="grid grid-cols-7 gap-y-1">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-y-1">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} />;
                    }

                    const disabledDate = isDisabledDate(date);
                    const active = sameDate(date, selectedDate);

                    return (
                      <div key={date.toISOString()} className="relative flex aspect-square items-center justify-center">
                        <button
                          type="button"
                          disabled={disabledDate}
                          onClick={() => {
                            onChange(formatDateKey(date));
                            setOpen(false);
                            setFocused(false);
                          }}
                          className={cn(
                            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                            active
                              ? "bg-[color:var(--brand)] text-white shadow-[0_8px_18px_rgba(39,69,111,0.22)]"
                              : disabledDate
                                ? "cursor-not-allowed text-[color:var(--muted-foreground)] opacity-35"
                                : "text-[color:var(--foreground)] hover:bg-[color:var(--surface)]",
                          )}
                        >
                          {date.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </FieldShell>
    </div>
  );
}
