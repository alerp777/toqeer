import { useMemo } from "react";

/* ── Static design-token constants ───────────────────────────────────────────
   These mirror the @theme inline tokens defined in src/index.css.

   Use RIDER_TOKENS directly in any context where Tailwind utility classes are
   unavailable: canvas rendering, Chart.js / Recharts datasets, PDF generation,
   Three.js materials, server-rendered emails, inline style objects, or tests.

   For Tailwind JSX just use the utility classes (bg-brand, bg-surface, etc.)
   defined in index.css — the tokens here are for non-CSS consumers only.      */

const BRAND_RGB = "240,185,11" as const; // #F0B90B decomposed for alpha variants

export const RIDER_TOKENS = {
  /* Solid colours */
  brand:      "#F0B90B",
  brandHover: "#e0ac00",
  surface:    "#0b0e11",
  pageBg:     "#F5F6F8",

  /* Dark elevation layer — raised cards sit above the surface */
  cardDark:   "#131720",   /* bg-card-dark */
  borderDark: "#252836",   /* use via var(--color-border-dark) in inline styles */

  /* Glass overlay rgba values — used inside dark gradient headers */
  glass:       "rgba(255,255,255,0.06)",
  glassRaised: "rgba(255,255,255,0.08)",
  glassDim:    "rgba(255,255,255,0.04)",

  /** Returns a rgba string for `brand` at any opacity (0–1).
   *  @example RIDER_TOKENS.brandAlpha(0.35) → "rgba(240,185,11,0.35)"  */
  brandAlpha: (opacity: number): string => `rgba(${BRAND_RGB},${opacity})`,
} as const;

/* ── Tailwind class name map ─────────────────────────────────────────────────
   Typed mapping for dynamic className builders, Storybook args, or tests.
   All values correspond to tokens in the @theme inline + @layer utilities
   blocks in src/index.css.                                                    */
export const RIDER_CLASSES = {
  bgBrand:       "bg-brand",
  bgBrandHover:  "hover:bg-brand-hover",
  textBrand:     "text-brand",
  borderBrand:   "border-brand",
  fromBrand:     "from-brand",
  ringBrand:     "ring-brand",
  bgSurface:     "bg-surface",
  textSurface:   "text-surface",
  bgPageBg:      "bg-page-bg",
  bgGlass:       "bg-glass",
  bgGlassRaised: "bg-glass-raised",
  bgGlassDim:    "bg-glass-dim",
  borderGlass:   "border-glass",
} as const;

export type RiderTokenKey = keyof typeof RIDER_TOKENS;
export type RiderClassKey = keyof typeof RIDER_CLASSES;

/* ── Runtime hook (reads live CSS custom properties) ─────────────────────────
   Returns token values read from the document's computed CSS custom properties
   so they automatically pick up any runtime theme overrides.
   Falls back to RIDER_TOKENS if the document is unavailable (SSR / tests).
   Deps are empty — tokens never change at runtime under the current theme.    */

function readCssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function useThemeTokens() {
  return useMemo(
    () => ({
      brand:      readCssVar("--color-brand",       RIDER_TOKENS.brand),
      brandHover: readCssVar("--color-brand-hover", RIDER_TOKENS.brandHover),
      surface:    readCssVar("--color-surface",     RIDER_TOKENS.surface),
      pageBg:     readCssVar("--color-page-bg",     RIDER_TOKENS.pageBg),
      cardDark:   readCssVar("--color-card-dark",   RIDER_TOKENS.cardDark),
      borderDark: readCssVar("--color-border-dark", RIDER_TOKENS.borderDark),

      /* Glass values use rgba — no CSS var equivalent; use static constants. */
      glass:       RIDER_TOKENS.glass,
      glassRaised: RIDER_TOKENS.glassRaised,
      glassDim:    RIDER_TOKENS.glassDim,

      /* Alpha helper available on the hook return for convenience */
      brandAlpha: RIDER_TOKENS.brandAlpha,

      /* Tailwind class map — avoids string-literal duplication in dynamic builders */
      classes: RIDER_CLASSES,
    }),
    [] // tokens are stable — no re-render triggers needed
  );
}
