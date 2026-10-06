"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   BloodAxis Button System
   ─ All sizes enforce minimum touch targets per design system:
     sm  = 44px (minimum accessible touch target)
     md  = 52px (primary CTA default)
     lg  = 60px
     xl  = 68px (hero CTAs)
     icon = 44×44px
   ─ No bounce, no elastic. Hover: scale(1.01), 150ms ease-out.
   ─ Colors reference CSS custom properties — never raw hex.
   ───────────────────────────────────────────────────────────── */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold tracking-tight",
    "transition-colors transition-transform transition-shadow duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-[var(--color-primary)]",
    "disabled:pointer-events-none disabled:opacity-40",
    "select-none cursor-pointer",
    "hover:scale-[1.01] active:scale-[0.99]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary CTA — warmer red (#D63A3A), the main action
        primary: [
          "bg-[var(--color-cta)] text-white",
          "border border-transparent",
          "hover:bg-[var(--color-cta-hover)]",
          "hover:shadow-[var(--shadow-card-hover)]",
          "active:shadow-none",
        ].join(" "),

        // Secondary — white background, border, dark text
        secondary: [
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
          "border border-[var(--color-border)]",
          "hover:border-[var(--color-text-muted)]",
          "hover:shadow-[var(--shadow-card)]",
        ].join(" "),

        // Outline — primary-colored border, transparent bg
        outline: [
          "bg-transparent text-[var(--color-primary)]",
          "border-2 border-[var(--color-primary)]",
          "hover:bg-[#FEE2E2]",
        ].join(" "),

        // Ghost — no background, no border
        ghost: [
          "bg-transparent text-[var(--color-text-secondary)]",
          "border border-transparent",
          "hover:bg-[var(--color-base-100)] hover:text-[var(--color-text-primary)]",
        ].join(" "),

        // Ghost muted — for secondary actions in dark surfaces
        "ghost-muted": [
          "bg-[var(--color-base-100)] text-[var(--color-text-primary)]",
          "border border-[var(--color-border)]",
          "hover:bg-[var(--color-border-subtle)]",
        ].join(" "),

        // Danger — for destructive actions (cancel, delete)
        danger: [
          "bg-transparent text-[var(--color-danger)]",
          "border border-[var(--color-danger)]",
          "hover:bg-[var(--color-danger-light)]",
        ].join(" "),

        // Danger solid — full red, for confirmed destructive
        "danger-solid": [
          "bg-[var(--color-danger)] text-white",
          "border border-transparent",
          "hover:bg-[#B91C1C]",
          "hover:shadow-[var(--shadow-card-hover)]",
        ].join(" "),

        // Success — fulfilled, confirmed states
        success: [
          "bg-[var(--color-success)] text-white",
          "border border-transparent",
          "hover:bg-[#059669]",
          "hover:shadow-[var(--shadow-card-hover)]",
        ].join(" "),

        // Link — text-only
        link: [
          "bg-transparent text-[var(--color-primary)]",
          "border border-transparent",
          "underline-offset-4 hover:underline",
          "hover:scale-[1] active:scale-[1]",
        ].join(" "),

        // Clay — dark surface button (used in dark contexts)
        clay: [
          "bg-[var(--color-surface-zinc)] text-white",
          "border border-transparent",
          "hover:bg-[var(--color-surface-zinc-hover)]",
          "hover:shadow-[var(--shadow-clay-hard)]",
        ].join(" "),

        // Ghost clay — light gray surface
        "ghost-clay": [
          "bg-[var(--color-base-100)] text-[var(--color-base-900)]",
          "border border-[var(--color-base-200)]",
          "hover:shadow-[var(--shadow-clay)]",
        ].join(" "),
      },

      size: {
        // 44px — minimum accessible touch target
        sm: "h-11 px-4 text-sm rounded-[var(--radius-button)]",
        // 52px — primary CTA (default)
        md: "h-[52px] px-6 text-sm rounded-[var(--radius-button)]",
        // 60px — large CTAs
        lg: "h-[60px] px-8 text-base rounded-[var(--radius-button)]",
        // 68px — hero / full-page CTAs
        xl: "h-[68px] px-10 text-base rounded-[var(--radius-button)]",
        // 44×44px — icon button
        icon: "h-11 w-11 rounded-[var(--radius-button)] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
