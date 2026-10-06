import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   BloodRelay Skeleton System
   ─ Replaces ALL spinners. Skeletons communicate progress
     while preserving layout stability.
   ─ Shimmer sweeps right → left (1.6s, ease-in-out, infinite)
   ─ Never shows spinner. Never shows "Loading..." text.
   ───────────────────────────────────────────────────────────── */

// ── Base skeleton block ──────────────────────────────────────

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

// ── SkeletonText — lines of text placeholder ─────────────────

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

function SkeletonText({ lines = 3, className, lastLineWidth = "60%" }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded-full"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

// ── SkeletonAvatar — circular avatar placeholder ─────────────

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

function SkeletonAvatar({ size = 40, className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn("rounded-full flex-shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

// ── SkeletonCard — full card placeholder ─────────────────────

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  lines?: number;
}

function SkeletonCard({ className, showAvatar = false, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border)] p-6",
        "bg-[var(--color-bg-elevated)]",
        className
      )}
      aria-hidden="true"
    >
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <SkeletonAvatar size={44} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 rounded-full w-1/3" />
            <Skeleton className="h-3 rounded-full w-1/2" />
          </div>
        </div>
      )}
      <SkeletonText lines={lines} />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 rounded-[var(--radius-button)] flex-1" />
        <Skeleton className="h-11 rounded-[var(--radius-button)] w-24" />
      </div>
    </div>
  );
}

// ── SkeletonMap — map area placeholder ──────────────────────

interface SkeletonMapProps {
  className?: string;
  height?: number | string;
}

function SkeletonMap({ className, height = 280 }: SkeletonMapProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] overflow-hidden relative",
        className
      )}
      style={{ height }}
      aria-hidden="true"
    >
      <Skeleton className="w-full h-full rounded-none" />
      {/* Simulated map crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shadow-sm">
          <div className="w-3 h-3 rounded-full skeleton" />
        </div>
      </div>
    </div>
  );
}

// ── SkeletonTimeline — lifecycle timeline placeholder ─────────

interface SkeletonTimelineProps {
  steps?: number;
  className?: string;
}

function SkeletonTimeline({ steps = 5, className }: SkeletonTimelineProps) {
  return (
    <div className={cn("space-y-0", className)} aria-hidden="true">
      {Array.from({ length: steps }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
            {i < steps - 1 && (
              <Skeleton className="w-0.5 flex-1 rounded-none mt-1" style={{ minHeight: 32 }} />
            )}
          </div>
          {/* Content */}
          <div className="pb-6 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-4 rounded-full w-2/3" />
            <Skeleton className="h-3 rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SkeletonRequestCard — request feed card placeholder ───────

function SkeletonRequestCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border)] p-5",
        "bg-[var(--color-bg-elevated)]",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between mb-4">
        {/* Blood group large */}
        <Skeleton className="h-12 w-16 rounded-[var(--radius-input)] font-metric" />
        {/* Urgency badge */}
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonText lines={2} lastLineWidth="45%" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 rounded-full w-24" />
        <Skeleton className="h-11 w-28 rounded-[var(--radius-button)]" />
      </div>
    </div>
  );
}

// ── SkeletonDashboard — multi-card dashboard placeholder ──────

function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      {/* Top card (large) */}
      <Skeleton className="h-40 rounded-[var(--radius-card)] w-full" />
      {/* Request cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonRequestCard key={i} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonMap,
  SkeletonTimeline,
  SkeletonRequestCard,
  SkeletonDashboard,
};
