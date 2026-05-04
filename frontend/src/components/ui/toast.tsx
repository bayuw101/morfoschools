import {
  AlertCircle,
  CircleCheckBig,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
};

const toastToneStyles: Record<
  ToastTone,
  {
    wrapper: string;
    icon: string;
    action: string;
  }
> = {
  info: {
    wrapper:
      "border-[oklch(83%_0.06_250)] bg-[oklch(96%_0.025_250)] text-[oklch(31%_0.09_250)]",
    icon: "bg-[oklch(90%_0.055_250)] text-[oklch(46%_0.15_250)]",
    action:
      "border-[oklch(78%_0.07_250)] text-[oklch(40%_0.13_250)] hover:bg-[oklch(92%_0.04_250)]",
  },
  success: {
    wrapper:
      "border-[oklch(84%_0.08_150)] bg-[oklch(96%_0.04_150)] text-[oklch(30%_0.08_150)]",
    icon: "bg-[oklch(90%_0.08_150)] text-[oklch(43%_0.14_150)]",
    action:
      "border-[oklch(78%_0.09_150)] text-[oklch(37%_0.13_150)] hover:bg-[oklch(92%_0.055_150)]",
  },
  warning: {
    wrapper:
      "border-[oklch(86%_0.11_83)] bg-[oklch(97%_0.055_83)] text-[oklch(34%_0.08_83)]",
    icon: "bg-[oklch(91%_0.105_83)] text-[oklch(54%_0.14_83)]",
    action:
      "border-[oklch(80%_0.12_83)] text-[oklch(43%_0.11_83)] hover:bg-[oklch(93%_0.07_83)]",
  },
  error: {
    wrapper:
      "border-[oklch(86%_0.065_28)] bg-[oklch(97%_0.03_28)] text-[oklch(34%_0.09_28)]",
    icon: "bg-[oklch(91%_0.07_28)] text-[oklch(52%_0.18_28)]",
    action:
      "border-[oklch(80%_0.08_28)] text-[oklch(45%_0.15_28)] hover:bg-[oklch(93%_0.045_28)]",
  },
};

const toastIcons = {
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

type ToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toastIcons[toast.tone];
  const toneStyle = toastToneStyles[toast.tone];

  return (
    <div
      className={cn(
        "w-full rounded-[30px] border p-3.5 shadow-[0_18px_42px_rgba(8,16,28,0.12)]",
        toneStyle.wrapper,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
            toneStyle.icon,
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-sm font-semibold leading-5 tracking-tight">
              {toast.title}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-mr-1 -mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-xl opacity-60 transition-all hover:bg-white/55 hover:opacity-100 active:scale-95"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4 mt-2 mr-2" />
            </button>
          </div>

          {toast.description ? (
            <p className="mt-1 text-sm leading-5 opacity-75">
              {toast.description}
            </p>
          ) : null}

          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className={cn(
                "mt-3 inline-flex h-8 items-center justify-center rounded-full border bg-white/45 px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
                toneStyle.action,
              )}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
