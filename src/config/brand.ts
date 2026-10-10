export const brand = {
  name: "StarTech",
  tagline: "Learn. Build. Launch.",
  description:
    "A cohort-based learning platform where students learn on a shared schedule with live sessions, async video lessons, peer reviews, and an AI study buddy.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  colors: {
    // Deep blue family — primary brand color
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#1e3a5f",
      600: "#0f2b4a",
      700: "#0a1f36",
      800: "#071929",
      900: "#061222",
      950: "#030a14",
    },
    // Neon green — primary accent
    accent: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
    },
    // Electric orange — secondary accent
    electric: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
    // Neutral grays
    neutral: {
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
      950: "#09090b",
    },
  },

  fonts: {
    heading: "var(--font-outfit)",
    body: "var(--font-inter)",
    mono: "var(--font-jetbrains-mono)",
  },

  // Social links
  social: {
    twitter: "",
    github: "",
    linkedin: "",
    youtube: "",
  },
} as const;

export type BrandConfig = typeof brand;
