"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/Button";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   BloodRelay EmptyState
   ─ Tone: warm, human, reassuring. Never cold or abandoned.
   ─ Design system rule: users should never feel the system
     stopped or has nothing to offer them.
   ─ No heavy illustrations. Simple icon + copy + optional CTA.
   ─ Inspired by: Untitled UI, Apple, Linear
   ───────────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeConfig = {
    sm: {
      wrapper: "py-8 px-4",
      iconWrapper: "w-10 h-10 text-2xl",
      title: "text-base font-semibold",
      message: "text-sm mt-1",
      spacing: "gap-3",
    },
    md: {
      wrapper: "py-12 px-6",
      iconWrapper: "w-14 h-14 text-3xl",
      title: "text-lg font-semibold",
      message: "text-sm mt-2",
      spacing: "gap-4",
    },
    lg: {
      wrapper: "py-16 px-8",
      iconWrapper: "w-16 h-16 text-4xl",
      title: "text-xl font-semibold",
      message: "text-base mt-2",
      spacing: "gap-5",
    },
  }[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeConfig.wrapper,
        sizeConfig.spacing,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon area */}
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-[var(--radius-card)]",
            "bg-[var(--color-base-100)]",
            "text-[var(--color-text-muted)]",
            sizeConfig.iconWrapper
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Copy */}
      <div className="max-w-xs space-y-1">
        <p
          className={cn(
            "font-[var(--font-display)] text-[var(--color-text-primary)]",
            sizeConfig.title
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "font-[var(--font-body)] text-[var(--color-text-secondary)] leading-relaxed",
            sizeConfig.message
          )}
        >
          {message}
        </p>
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                onClick={action.onClick}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                {action.label}
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Preset empty states ───────────────────────────────────────
// Use these for consistent copy across the app.

export function EmptyStateFeed({ className }: { className?: string }) {
  return (
    <EmptyState
      title="No active requests right now"
      message="BloodRelay is ready whenever someone nearby needs help. You'll be notified immediately."
      className={className}
    />
  );
}

export function EmptyStateMyPosts({ className }: { className?: string }) {
  return (
    <EmptyState
      title="No requests posted yet"
      message="When you create a blood request, it will appear here so you can track its progress."
      className={className}
    />
  );
}

export function EmptyStateNotifications({ className }: { className?: string }) {
  return (
    <EmptyState
      title="You're all caught up"
      message="Notifications will appear here when someone needs help nearby or your request is updated."
      className={className}
    />
  );
}

export function EmptyStateActivity({ className }: { className?: string }) {
  return (
    <EmptyState
      title="Your story begins here"
      message="When you help someone or create a request, it will appear in your activity timeline."
      className={className}
    />
  );
}

export function EmptyStateSearch({ query, className }: { query?: string; className?: string }) {
  return (
    <EmptyState
      title={query ? `No results for "${query}"` : "Nothing found"}
      message="Try searching with a different blood group, hospital name, or city."
      className={className}
    />
  );
}
