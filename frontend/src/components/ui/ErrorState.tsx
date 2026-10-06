"use client";

import * as React from "react";
import { WifiOff, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/* ─────────────────────────────────────────────────────────────
   BloodRelay ErrorState
   ─ Apple-style: never blame the user. Never say "Something
     went wrong." Always explain three things:
       1. What happened
       2. What BloodRelay is doing about it
       3. What the user can do next
   ─ Tone: calm, reassuring. Reduces anxiety rather than adding to it.
   ─ Design system rule: "Every interaction communicates:
     You are not alone. BloodRelay is working for you."
   ───────────────────────────────────────────────────────────── */

export type ErrorType =
  | "network"
  | "location"
  | "notFound"
  | "server"
  | "permission"
  | "generic";

export interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

// ── Default copy per error type ───────────────────────────────

const ERROR_DEFAULTS: Record<
  ErrorType,
  { title: string; message: string; icon: React.ElementType; iconClassName: string }
> = {
  network: {
    title: "We're having trouble connecting",
    message:
      "Your request is safe — we'll resume as soon as the connection is restored. Please check your internet and try again.",
    icon: WifiOff,
    iconClassName: "text-[var(--color-text-muted)]",
  },
  location: {
    title: "We couldn't get your location",
    message:
      "BloodRelay needs your location to find nearby donors. You can enter it manually below instead.",
    icon: MapPin,
    iconClassName: "text-[var(--color-warning)]",
  },
  notFound: {
    title: "This request is no longer active",
    message:
      "The blood request may have been fulfilled, cancelled, or expired. Check your dashboard for other ways to help.",
    icon: AlertTriangle,
    iconClassName: "text-[var(--color-text-muted)]",
  },
  server: {
    title: "BloodRelay is taking longer than expected",
    message:
      "Our servers are responding slowly right now. Your information is safe — please wait a moment and try again.",
    icon: RefreshCw,
    iconClassName: "text-[var(--color-text-muted)]",
  },
  permission: {
    title: "Permission required",
    message:
      "BloodRelay needs this permission to work properly. You can update it in your device settings and return here.",
    icon: AlertTriangle,
    iconClassName: "text-[var(--color-warning)]",
  },
  generic: {
    title: "We hit an unexpected issue",
    message:
      "BloodRelay is still working. This usually resolves on its own — tap below to try again, or return to the dashboard.",
    icon: RefreshCw,
    iconClassName: "text-[var(--color-text-muted)]",
  },
};

export function ErrorState({
  type = "generic",
  title,
  message,
  detail,
  onRetry,
  retryLabel = "Try again",
  action,
  className,
  size = "md",
}: ErrorStateProps) {
  const defaults = ERROR_DEFAULTS[type];
  const Icon = defaults.icon;

  const resolvedTitle = title ?? defaults.title;
  const resolvedMessage = message ?? defaults.message;

  const sizeConfig = {
    sm: {
      wrapper: "py-8 px-4",
      iconWrapper: "w-10 h-10",
      iconSize: 18,
      title: "text-base font-semibold",
      message: "text-sm",
      spacing: "gap-3",
    },
    md: {
      wrapper: "py-12 px-6",
      iconWrapper: "w-14 h-14",
      iconSize: 22,
      title: "text-lg font-semibold",
      message: "text-sm",
      spacing: "gap-4",
    },
    lg: {
      wrapper: "py-16 px-8",
      iconWrapper: "w-16 h-16",
      iconSize: 26,
      title: "text-xl font-semibold",
      message: "text-base",
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
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-card)]",
          "bg-[var(--color-base-100)]",
          sizeConfig.iconWrapper
        )}
        aria-hidden="true"
      >
        <Icon
          size={sizeConfig.iconSize}
          className={defaults.iconClassName}
          strokeWidth={1.5}
        />
      </div>

      {/* Copy */}
      <div className="max-w-xs space-y-1.5">
        <p
          className={cn(
            "font-[var(--font-display)] text-[var(--color-text-primary)]",
            sizeConfig.title
          )}
        >
          {resolvedTitle}
        </p>
        <p
          className={cn(
            "font-[var(--font-body)] text-[var(--color-text-secondary)] leading-relaxed",
            sizeConfig.message
          )}
        >
          {resolvedMessage}
        </p>
        {detail && (
          <p className="text-xs text-[var(--color-text-muted)] font-[var(--font-metric)] mt-1">
            {detail}
          </p>
        )}
      </div>

      {/* Actions */}
      {(onRetry || action) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw size={14} aria-hidden="true" />
              {retryLabel}
            </Button>
          )}
          {action && (
            <Button variant="ghost" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Preset error states ───────────────────────────────────────

export function NetworkError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return <ErrorState type="network" onRetry={onRetry} className={className} />;
}

export function LocationError({
  onManual,
  className,
}: {
  onManual?: () => void;
  className?: string;
}) {
  return (
    <ErrorState
      type="location"
      action={onManual ? { label: "Enter location manually", onClick: onManual } : undefined}
      className={className}
    />
  );
}

export function NotFoundError({
  onBack,
  className,
}: {
  onBack?: () => void;
  className?: string;
}) {
  return (
    <ErrorState
      type="notFound"
      action={onBack ? { label: "Back to dashboard", onClick: onBack } : undefined}
      className={className}
    />
  );
}
