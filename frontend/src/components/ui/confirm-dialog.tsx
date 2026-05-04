"use client";

import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

type ConfirmDialogTone = "default" | "warning" | "danger";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  details?: React.ReactNode;
};

const toneMap = {
  default: {
    icon: ShieldAlert,
    iconClass: "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]",
    confirmVariant: "primary" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
    confirmVariant: "primary" as const,
  },
  danger: {
    icon: Trash2,
    iconClass: "bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
    confirmVariant: "danger" as const,
  },
} as const;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  details,
}: ConfirmDialogProps) {
  const config = toneMap[tone];
  const Icon = config.icon;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", config.iconClass)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
            {details ?? "Pastikan aksi ini memang perlu dijalankan karena proses ini bisa memengaruhi data atau workflow aktif."}
          </div>
        </div>
      </div>
    </Modal>
  );
}
