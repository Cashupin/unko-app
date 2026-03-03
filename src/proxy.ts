import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Instantiate NextAuth from the edge-compatible config only.
// This does NOT import prisma or pg — safe for Edge runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { nextUrl } = req;

  if (!session?.user) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.redirect(
      new URL("/auth/error?error=AccessDenied", req.url),
    );
  }

  return NextResponse.next();
});

export const config = {
  // Protect everything except NextAuth API routes, static files and the error page
  matcher: ["/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)"],
};
