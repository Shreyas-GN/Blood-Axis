import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/emergency",
  "/request/(.*)",
  "/api/webhooks/clerk",
  "/api/ai/parse-request",
  "/api/auth/(.*)",
  "/api/alerts/(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip _next internals, static assets, and common file extensions.
    // The negative lookahead order matters: check path prefixes before extension globs.
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico|css|js|woff2?|ttf|eot|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and trpc routes (catches routes that might match the extension glob above)
    "/(api|trpc)(.*)",
  ],
};
