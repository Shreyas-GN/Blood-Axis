import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   BloodRelay Input
   ─ Minimum height 44px (accessible touch target)
   ─ Radius: --radius-input (16px)
   ─ Border: --color-border token
   ─ Focus: --color-primary ring (not brand-red)
   ─ Font: --font-body (Inter)
   ───────────────────────────────────────────────────────────── */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Layout
          "flex h-11 w-full px-4 py-2",
          // Shape
          "rounded-[var(--radius-input)]",
          // Color
          "border border-[var(--color-border)]",
          "bg-[var(--color-bg-elevated)]",
          "text-[var(--color-text-primary)]",
          // Typography
          "font-[var(--font-body)] text-sm",
          // Placeholder
          "placeholder:text-[var(--color-text-muted)]",
          // Focus
          "focus:outline-none",
          "focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
          "focus:border-[var(--color-primary)]",
          // Transition
          "transition-[border-color,box-shadow] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
