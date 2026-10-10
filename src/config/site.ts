import { brand } from "./brand";

export const siteConfig = {
  name: brand.name,
  tagline: brand.tagline,
  description: brand.description,
  url: brand.url,

  // SEO defaults
  seo: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    openGraph: {
      type: "website" as const,
      locale: "en_US",
      url: brand.url,
      siteName: brand.name,
      images: [
        {
          url: `${brand.url}/og-image.png`,
          width: 1200,
          height: 630,
          alt: brand.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      site: brand.social.twitter,
    },
  },

  // Default currency
  currency: {
    code: "GHS" as const,
    symbol: "GH₵",
    locale: "en-GH",
  },

  // Payment gateways
  payments: {
    stripe: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true",
    },
    paystack: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_PAYSTACK === "true",
    },
  },

  // Default cohort settings
  defaults: {
    postCohortAccessDays: 90,
    seatReservationMinutes: 15,
    peerReviewCount: 2,
    aiMonthlyQuestionLimit: 200,
    certificate: {
      lessonsCompletePercent: 80,
      liveAttendancePercent: 70,
      assignmentsSubmittedPercent: 100,
      peerReviewsCompletedPercent: 100,
    },
  },

  // Live session platforms
  livePlatforms: ["zoom", "youtube", "tiktok", "custom"] as const,
} as const;

export type SiteConfig = typeof siteConfig;
export type LivePlatform = (typeof siteConfig.livePlatforms)[number];
