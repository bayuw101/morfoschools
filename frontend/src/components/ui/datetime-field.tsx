"use client";

import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

export interface DatetimeFieldProps {
  label: string;
  value?: string; // Format: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  showTime?: boolean;
}

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

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatetimeField({
  label,
  value = "",
  onChange,
  error,
  helperText,
  disabled,
  className,
  showTime = true,
}: DatetimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) return null;
    const datePart = value.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    parsedDate || new Date()
  );

  const timePart = value && value.includes("T") ? value.split("T")[1].slice(0, 5) : "07:00";
  const hours = timePart.split(":")[0] || "07";
  const minutes = timePart.split(":")[1] || "00";

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDateSelect = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    
    const dateStr = `${y}-${m}-${d}`;
    if (showTime) {
      onChange?.(`${dateStr}T${hours}:${minutes}`);
    } else {
      onChange?.(dateStr);
      setOpen(false); // Close automatically if no time needed
    }
  };

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    const dateStr = parsedDate 
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    
    let newH = hours;
    let newM = minutes;
    if (type === "hour") newH = val;
    if (type === "minute") newM = val;

    onChange?.(`${dateStr}T${newH}:${newM}`);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        parsedDate &&
        parsedDate.getDate() === day &&
        parsedDate.getMonth() === month &&
        parsedDate.getFullYear() === year;

      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === month &&
        new Date().getFullYear() === year;

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
            isSelected
              ? "bg-[color:var(--brand)] font-semibold text-white"
              : isToday
              ? "bg-[color:var(--surface-subtle)] font-semibold text-[color:var(--brand)]"
              : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]"
          )}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="p-3">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[color:var(--surface-subtle)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold">
            {MONTHS[month]} {year}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[color:var(--surface-subtle)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Days Header */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-xs font-medium text-[color:var(--muted-foreground)]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  const formattedDisplay = React.useMemo(() => {
    if (!parsedDate) return "";
    const base = `${String(parsedDate.getDate()).padStart(2, "0")}/${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${parsedDate.getFullYear()}`;
    return showTime ? `${base} ${hours}:${minutes}` : base;
  }, [parsedDate, hours, minutes, showTime]);

  return (
    <div ref={rootRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          setFocused(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) {
              setOpen(true);
              setFocused(true);
            }
          }
        }}
        className="outline-none"
      >
        <FieldShell
          label={label}
          active={focused || open}
          filled={!!value}
          disabled={disabled}
          error={error}
          helperText={helperText}
          leading={
            showTime ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4" />
            )
          }
          className={cn(className, "cursor-pointer")}
        >
          <div className="flex h-[58px] items-end pb-2.5 pl-16 pr-4 pt-7">
            <span
              className={cn(
                "block truncate text-sm font-semibold transition-colors",
                !value ? "text-transparent" : "text-[color:var(--foreground)]"
              )}
            >
              {formattedDisplay || "Placeholder"}
            </span>
          </div>
        </FieldShell>
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg animate-in fade-in slide-in-from-top-2">
          {renderCalendar()}

          {showTime && (
            <div className="border-t border-[color:var(--border)] p-3">
              <p className="mb-2 text-center text-xs font-semibold text-[color:var(--muted-foreground)]">
                Time
              </p>
              <div className="flex h-36 items-stretch justify-center gap-2 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-1">
                {/* Hours List */}
                <div 
                  className="hide-scrollbar flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth rounded-lg bg-[color:var(--surface)] text-center"
                  ref={(el) => {
                    if (el && open) {
                      const active = el.querySelector("[data-active='true']");
                      if (active) active.scrollIntoView({ block: "center" });
                    }
                  }}
                >
                  <div className="h-12" /> {/* Top padding for snap centering */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = String(i).padStart(2, "0");
                    const isSelected = h === hours;
                    return (
                      <button
                        key={`h-${h}`}
                        type="button"
                        data-active={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTimeChange("hour", h);
                        }}
                        className={cn(
                          "block w-full snap-center py-2.5 text-base font-semibold transition-all",
                          isSelected
                            ? "bg-[color:var(--brand-soft)] text-[color:var(--brand)] scale-110 rounded-lg shadow-sm"
                            : "text-[color:var(--muted-foreground)] opacity-50 hover:bg-[color:var(--surface-subtle)] hover:opacity-100"
                        )}
                      >
                        {h}
                      </button>
                    );
                  })}
                  <div className="h-12" /> {/* Bottom padding */}
                </div>
                
                {/* Divider */}
                <div className="flex flex-col items-center justify-center font-bold text-[color:var(--muted-foreground)]">
                  :
                </div>

                {/* Minutes List */}
                <div 
                  className="hide-scrollbar flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth rounded-lg bg-[color:var(--surface)] text-center"
                  ref={(el) => {
                    if (el && open) {
                      const active = el.querySelector("[data-active='true']");
                      if (active) active.scrollIntoView({ block: "center" });
                    }
                  }}
                >
                  <div className="h-12" /> {/* Top padding for snap centering */}
                  {Array.from({ length: 60 }).map((_, i) => {
                    const m = String(i).padStart(2, "0");
                    const isSelected = m === minutes;
                    return (
                      <button
                        key={`m-${m}`}
                        type="button"
                        data-active={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTimeChange("minute", m);
                        }}
                        className={cn(
                          "block w-full snap-center py-2.5 text-base font-semibold transition-all",
                          isSelected
                            ? "bg-[color:var(--brand-soft)] text-[color:var(--brand)] scale-110 rounded-lg shadow-sm"
                            : "text-[color:var(--muted-foreground)] opacity-50 hover:bg-[color:var(--surface-subtle)] hover:opacity-100"
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                  <div className="h-12" /> {/* Bottom padding */}
                </div>
              </div>
            </div>
          )}
          
          <div className="border-t border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFocused(false);
              }}
              className="w-full rounded-xl py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}