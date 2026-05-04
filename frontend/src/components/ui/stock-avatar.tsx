"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type StockAvatarProps = {
  symbol: string;
  iconUrl: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  size?: number;
};

function getPreferredStockIconUrl(symbol: string, iconUrl: string | null) {
  const normalized = iconUrl?.trim();
  if (normalized) {
    return normalized;
  }

  return `https://assets.stockbit.com/logos/companies/${symbol.trim().toUpperCase()}.png`;
}

export function StockAvatar({
  symbol,
  iconUrl,
  className,
  imageClassName,
  fallbackClassName,
  size = 40,
}: StockAvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const resolvedIconUrl = React.useMemo(
    () => getPreferredStockIconUrl(symbol, iconUrl),
    [iconUrl, symbol],
  );
  const showImage = Boolean(resolvedIconUrl) && !failed;

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface-subtle)]",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={resolvedIconUrl}
          alt={`${symbol} logo`}
          width={size}
          height={size}
          unoptimized
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]",
            fallbackClassName,
          )}
        >
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
