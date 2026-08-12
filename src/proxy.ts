import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/onboarding",
  "/onboarding/(.*)",
  "/manufacturer",
  "/manufacturer/(.*)",
  "/architect",
  "/architect/(.*)",
  "/distributor",
  "/distributor/(.*)",
  "/retailer",
  "/retailer/(.*)",
  "/sales-rep",
  "/sales-rep/(.*)",
  "/cart",
  "/cart/(.*)",
  "/admin",
  "/admin/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
