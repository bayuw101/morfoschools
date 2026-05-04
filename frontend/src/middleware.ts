import { NextResponse, type NextRequest } from "next/server";
import { decideAuthGuard } from "@/lib/auth-guard";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = !!request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  const decision = decideAuthGuard(pathname, hasToken);

  if (decision.action === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only run middleware on non-static paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
