import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/emergency(.*)",
  /^\/request\/[^/]+$/,
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
  "/icon",
  "/apple-icon",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (!isPublicRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico|css|js|woff2?|ttf|eot|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
