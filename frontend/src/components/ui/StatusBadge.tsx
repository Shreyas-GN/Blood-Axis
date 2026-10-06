"use client";

import * as React from "react";
import {
  Search,
  Heart,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   BloodRelay StatusBadge
   ─ Every status shows: COLOR + ICON + TEXT
     Color alone fails WCAG accessibility.
   ─ Used for request statuses and urgency levels.
   ───────────────────────────────────────────────────────────── */

// ── Request status types ─────────────────────────────────────

export type RequestStatus =
  | "searching"
  | "donor_accepted"
  | "fulfilled"
  | "cancelled"
  | "expired";

export type UrgencyLevel = "IMMEDIATE" | "TODAY" | "SCHEDULED";

// ── Status config map ────────────────────────────────────────

const REQUEST_STATUS_CONFIG: Record<
  RequestStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    iconClassName: string;
  }
> = {
  searching: {
    label: "Searching",
    icon: Search,
    className:
      "bg-[var(--color-warning-light)] text-[#92400E] border border-[#FDE68A]",
    iconClassName: "text-[#B45309]",
  },
  donor_accepted: {
    label: "Donor Accepted",
    icon: Heart,
    className:
      "bg-[var(--color-success-light)] text-[#15803D] border border-[#A7F3D0]",
    iconClassName: "text-[#10B981]",
  },
  fulfilled: {
    label: "Fulfilled",
    icon: CheckCircle,
    className: "bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7]",
    iconClassName: "text-[#059669]",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "bg-[var(--color-base-100)] text-[var(--color-base-500)] border border-[var(--color-border)]",
    iconClassName: "text-[var(--color-text-muted)]",
  },
  expired: {
    label: "Expired",
    icon: Clock,
    className: "bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]",
    iconClassName: "text-[#EA580C]",
  },
};

// ── Urgency config map ────────────────────────────────────────

const URGENCY_CONFIG: Record<
  UrgencyLevel,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    iconClassName: string;
  }
> = {
  IMMEDIATE: {
    label: "Immediate",
    icon: Zap,
    className:
      "bg-[#FEE2E2] text-[var(--color-primary)] border border-[#FECACA]",
    iconClassName: "text-[var(--color-primary)]",
  },
  TODAY: {
    label: "Today",
    icon: AlertCircle,
    className:
      "bg-[var(--color-warning-light)] text-[#92400E] border border-[#FDE68A]",
    iconClassName: "text-[#B45309]",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: Calendar,
    className:
      "bg-[var(--color-base-100)] text-[var(--color-base-600)] border border-[var(--color-border)]",
    iconClassName: "text-[var(--color-text-muted)]",
  },
};

// ── Props ─────────────────────────────────────────────────────

interface StatusBadgeBaseProps {
  size?: "sm" | "md";
  className?: string;
  hideIcon?: boolean;
}

interface RequestStatusBadgeProps extends StatusBadgeBaseProps {
  status: RequestStatus;
  urgency?: never;
}

interface UrgencyBadgeProps extends StatusBadgeBaseProps {
  status?: never;
  urgency: UrgencyLevel;
}

export type StatusBadgeProps = RequestStatusBadgeProps | UrgencyBadgeProps;

// ── Component ─────────────────────────────────────────────────

export function StatusBadge({
  status,
  urgency,
  size = "md",
  className,
  hideIcon = false,
}: StatusBadgeProps) {
  const config = status
    ? REQUEST_STATUS_CONFIG[status]
    : URGENCY_CONFIG[urgency!];

  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  const iconSize = size === "sm" ? 10 : 12;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-badge)] font-semibold leading-none",
        "font-[var(--font-body)]",
        sizeClasses,
        config.className,
        className
      )}
    >
      {!hideIcon && (
        <Icon
          className={cn("flex-shrink-0", config.iconClassName)}
          size={iconSize}
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  );
}

// ── Convenience exports ───────────────────────────────────────

export function SearchingBadge(props: Omit<StatusBadgeBaseProps, "status">) {
  return <StatusBadge status="searching" {...props} />;
}

export function FulfilledBadge(props: Omit<StatusBadgeBaseProps, "status">) {
  return <StatusBadge status="fulfilled" {...props} />;
}

export function ImmediateBadge(props: Omit<StatusBadgeBaseProps, "urgency">) {
  return <StatusBadge urgency="IMMEDIATE" {...props} />;
}
