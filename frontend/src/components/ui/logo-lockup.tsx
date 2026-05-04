import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/cn";

type LogoLockupProps = { compact?: boolean; className?: string };

export function LogoLockup({ compact = false, className }: LogoLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#486b9c_0%,#233754_100%)] text-white shadow-[0_12px_24px_rgba(5,10,20,0.24)]">
        <GraduationCap className="h-5 w-5" />
      </div>
      {!compact ? (
        <div className="space-y-0.5">
          <p className="font-display text-base font-semibold tracking-tight text-white">Morfosis</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/58">Schools LMS</p>
        </div>
      ) : null}
    </div>
  );
}
