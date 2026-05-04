"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { appRoutes } from "@/config/routes";
import { getSession } from "@/lib/auth";
import { canAccessPath } from "@/lib/rbac";

type RouteGuardProps = { children: React.ReactNode };

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    const session = getSession();
    const canAccess = canAccessPath(session?.role, pathname);
    setAllowed(canAccess);
    if (!canAccess) {
      router.replace(appRoutes.appHome);
    }
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
