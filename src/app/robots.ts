import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/manufacturer",
          "/architect",
          "/distributor",
          "/retailer",
          "/sales-rep",
          "/cart",
          "/onboarding",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: "https://material-hub-rho.vercel.app/sitemap.xml",
  };
}
