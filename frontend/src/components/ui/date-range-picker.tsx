"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type Preset = {
  label: string;
  getValue: () => DateRange;
};

type DateRangePickerProps = {
  label?: string;
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
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

function addDays(date: Date, amount: number) {
  const nextDate = cloneDate(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getLatestWorkingDay(date: Date) {
  let current = cloneDate(date);

  while (isWeekend(current)) {
    current = addDays(current, -1);
  }

  return current;
}

function addWorkingDays(date: Date, amount: number) {
  if (amount === 0) return cloneDate(date);

  let current = cloneDate(date);
  let remaining = Math.abs(amount);
  const direction = amount > 0 ? 1 : -1;

  while (remaining > 0) {
    current = addDays(current, direction);

    if (!isWeekend(current)) {
      remaining -= 1;
    }
  }

  return current;
}

function sameDate(first: Date | null, second: Date | null) {
  if (!first || !second) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isDateBetween(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return date > start && date < end;
}

function formatCompactDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function startOfToday() {
  return cloneDate(new Date());
}

function workingDayRange(days: number): DateRange {
  const to = getLatestWorkingDay(startOfToday());
  const from = addWorkingDays(to, -(days - 1));
  return { from, to };
}

function yesterdayRange(): DateRange {
  const today = getLatestWorkingDay(startOfToday());
  const yesterday = addWorkingDays(today, -1);
  return { from: yesterday, to: yesterday };
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

function getDisplayValue(from: Date | null, to: Date | null, placeholder: string) {
  if (!from && !to) return placeholder;
  if (from && (!to || sameDate(from, to))) return formatCompactDate(from);
  if (from && to) return `${formatCompactDate(from)} - ${formatCompactDate(to)}`;
  return placeholder;
}

const presets: Preset[] = [
  { label: "Yesterday", getValue: yesterdayRange },
  { label: "Today", getValue: () => workingDayRange(1) },
  { label: "Last 5 days", getValue: () => workingDayRange(5) },
  { label: "Last 10 days", getValue: () => workingDayRange(10) },
  { label: "Last 20 days", getValue: () => workingDayRange(20) },
  { label: "Last 60 days", getValue: () => workingDayRange(60) },
  { label: "Last 120 days", getValue: () => workingDayRange(120) },
  { label: "Last 200 days", getValue: () => workingDayRange(200) },
];

export function DateRangePicker({
  label = "Date range",
  from,
  to,
  onChange,
  placeholder = "Select date range",
  helperText,
  error,
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [draftFrom, setDraftFrom] = React.useState<Date | null>(from);
  const [draftTo, setDraftTo] = React.useState<Date | null>(to);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(from ?? to ?? startOfToday());
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
    setCurrentMonth(from ?? to ?? startOfToday());
  }, [from, to]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFocused(false);
        setHoverDate(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setFocused(false);
        setHoverDate(null);
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

  const calendarDays = React.useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const hasValue = Boolean(from || to);
  const displayValue = getDisplayValue(from, to, placeholder);
  const openDisplayValue = getDisplayValue(draftFrom, draftTo, placeholder);

  function resetDraft() {
    setDraftFrom(from);
    setDraftTo(to);
    setHoverDate(null);
  }

  function applyRange(nextFrom: Date | null, nextTo: Date | null) {
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setHoverDate(null);
    onChange(nextFrom, nextTo);
  }

  function handleDateClick(date: Date) {
    if (isWeekend(date)) {
      return;
    }

    const nextDate = cloneDate(date);

    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(nextDate);
      setDraftTo(null);
      return;
    }

    if (nextDate < draftFrom) {
      setDraftFrom(nextDate);
      setDraftTo(null);
      return;
    }

    applyRange(draftFrom, nextDate);
    setOpen(false);
    setFocused(false);
  }

  function isPresetActive(preset: Preset) {
    const range = preset.getValue();
    return sameDate(range.from, draftFrom) && sameDate(range.to, draftTo);
  }

  return (
    <div className={cn("w-full", className)}>
      <div ref={rootRef} className="relative w-full">
        <FieldShell
          label={label}
          active={open || focused}
          filled={open || focused || hasValue}
          disabled={disabled}
          error={error}
          helperText={helperText}
          leading={<CalendarDays className="h-4 w-4" />}
        >
          <div className="relative flex items-stretch">
            <button
              ref={buttonRef}
              type="button"
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => {
                if (!open) {
                  resetDraft();
                }
                setOpen((currentValue) => !currentValue);
                setFocused(true);
              }}
              onFocus={() => {
                setFocused(true);
              }}
              onBlur={() => {
                if (!open) {
                  setFocused(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!open) {
                    resetDraft();
                  }
                  setOpen((currentValue) => !currentValue);
                  setFocused(true);
                }
              }}
              className={cn(
                "h-[58px] w-full bg-transparent px-4 pb-2.5 pt-7 text-left text-sm font-semibold text-[color:var(--foreground)] outline-none",
                "pl-16 pr-16",
              )}
            >
              <span
                className={cn(
                  "block truncate",
                  hasValue ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]",
                )}
              >
                {displayValue}
              </span>
            </button>

            <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3 text-[color:var(--muted-foreground)]">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
            </div>
          </div>

          {open ? (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_30px_62px_rgba(9,17,28,0.2)] md:w-[560px]">
              <div className="grid md:grid-cols-[180px_1fr]">
                <div className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-2 md:border-b-0 md:border-r">
                  <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const nextRange = preset.getValue();
                          setDraftFrom(nextRange.from);
                          setDraftTo(nextRange.to);
                          setCurrentMonth(nextRange.from ?? startOfToday());
                          applyRange(nextRange.from, nextRange.to);
                          setOpen(false);
                          setFocused(false);
                        }}
                        className={cn(
                          "rounded-[16px] px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                          isPresetActive(preset)
                            ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                            : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground)]",
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span>{MONTHS[currentMonth.getMonth()]}</span>
                      <span>{currentMonth.getFullYear()}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        resetDraft();
                        setOpen(false);
                        setFocused(false);
                        buttonRef.current?.focus();
                      }}
                      className="text-xs font-semibold text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="mt-2 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
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

                    <div className="mt-2 grid grid-cols-7 gap-y-1" onMouseLeave={() => setHoverDate(null)}>
                      {calendarDays.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} />;

                        const disabledDate = isWeekend(date);
                        const isRangeStart = sameDate(date, draftFrom);
                        const isRangeEnd = sameDate(date, draftTo);
                        const isHoverEndpoint =
                          !draftTo && Boolean(draftFrom) && Boolean(hoverDate) && !sameDate(draftFrom, hoverDate) && sameDate(date, hoverDate);
                        const isInRange = isDateBetween(date, draftFrom, draftTo);
                        const isHoverInRange =
                          !draftTo &&
                          Boolean(draftFrom) &&
                          Boolean(hoverDate) &&
                          ((date > (draftFrom as Date) && date < (hoverDate as Date)) ||
                            (date < (draftFrom as Date) && date > (hoverDate as Date)));
                        const hoverForward = Boolean(draftFrom && hoverDate && hoverDate > draftFrom);
                        const hoverBackward = Boolean(draftFrom && hoverDate && hoverDate < draftFrom);
                        const showRightTail =
                          (isRangeStart && Boolean(draftTo) && date < (draftTo as Date)) ||
                          (isRangeStart && !draftTo && hoverForward) ||
                          (!draftTo && hoverBackward && isHoverEndpoint);
                        const showLeftTail =
                          (isRangeEnd && Boolean(draftFrom) && date > (draftFrom as Date)) ||
                          (!draftTo && hoverForward && isHoverEndpoint) ||
                          (isRangeStart && !draftTo && hoverBackward);

                        return (
                          <div
                            key={date.toISOString()}
                            className="relative flex aspect-square items-center justify-center"
                            onMouseEnter={() => {
                              if (!disabledDate && draftFrom && !draftTo) {
                                setHoverDate(date);
                              }
                            }}
                          >
                            {(isInRange || isHoverInRange) ? (
                              <div className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 bg-[color:var(--brand-soft)]" />
                            ) : null}

                            {showRightTail ? (
                              <div className="absolute left-1/2 right-0 top-1/2 h-8 -translate-y-1/2 bg-[color:var(--brand-soft)]" />
                            ) : null}

                            {showLeftTail ? (
                              <div className="absolute left-0 right-1/2 top-1/2 h-8 -translate-y-1/2 bg-[color:var(--brand-soft)]" />
                            ) : null}

                            <button
                              type="button"
                              disabled={disabledDate}
                              onClick={() => handleDateClick(date)}
                              className={cn(
                                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                isRangeStart || isRangeEnd || isHoverEndpoint
                                  ? "bg-[color:var(--brand)] text-white shadow-[0_8px_18px_rgba(39,69,111,0.22)]"
                                  : disabledDate
                                    ? "cursor-not-allowed text-[color:var(--muted-foreground)] opacity-35"
                                    : "text-[color:var(--foreground)] hover:bg-[color:var(--surface)]",
                              )}
                              aria-label={disabledDate ? `${date.getDate()} unavailable weekend` : `${date.getDate()}`}
                            >
                              {date.getDate()}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">
                        Selected
                      </p>
                      <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                        {openDisplayValue}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </FieldShell>
      </div>
    </div>
  );
}
