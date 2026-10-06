import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Blood Axis Card System
   ─ All cards use --radius-card (28px). Never mix radius.
   ─ Shadow: --shadow-card (barely visible, intentional)
   ─ No glassmorphism. No heavy shadows. No gradients.
   ─ Interactive cards: scale(1.01) hover, 150ms ease-out.
   ───────────────────────────────────────────────────────────── */

const cardVariants = cva(
  "rounded-[var(--radius-card)] transition-colors transition-transform transition-shadow duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
  {
    variants: {
      variant: {
        // Default — standard content card
        default: [
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border)]",
          "shadow-[var(--shadow-card)]",
        ].join(" "),

        // Interactive — hover lifts, border highlights
        interactive: [
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border)]",
          "shadow-[var(--shadow-card)]",
          "hover:border-[var(--color-primary)]",
          "hover:shadow-[var(--shadow-card-hover)]",
          "hover:scale-[1.01]",
          "cursor-pointer",
        ].join(" "),

        // Elevated — modals, overlays
        elevated: [
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border)]",
          "shadow-[var(--shadow-elevated)]",
        ].join(" "),

        // Flat — no shadow, border only
        flat: [
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border)]",
        ].join(" "),

        // Subtle — very quiet, minimal border
        subtle: [
          "bg-[var(--color-base-50)]",
          "border border-[var(--color-border-subtle)]",
        ].join(" "),

        // Clay — matches legacy clay-card
        clay: [
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border)]",
          "shadow-[var(--shadow-clay)]",
        ].join(" "),

        // Status tint variants — for contextual cards
        success: [
          "bg-[var(--color-success-light)]",
          "border border-[#A7F3D0]",
        ].join(" "),

        warning: [
          "bg-[var(--color-warning-light)]",
          "border border-[#FDE68A]",
        ].join(" "),

        danger: [
          "bg-[var(--color-danger-light)]",
          "border border-[#FECACA]",
        ].join(" "),
      },

      padding: {
        none: "p-0",
        xs: "p-3",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-[var(--font-display)] text-xl font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[var(--color-text-secondary)] leading-relaxed",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
