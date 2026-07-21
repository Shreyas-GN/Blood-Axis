"use client";

export function SkeletonMapOverlay() {
  return (
    <>
      {/* Desktop skeleton overlay — top-left */}
      <div className="hidden md:block absolute top-4 left-4 z-20 w-[220px]">
        <div
          className="bg-[var(--color-bg-elevated)] rounded-[var(--radius-card)] overflow-hidden"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-[var(--color-border-subtle)] space-y-3">
            <div className="h-2.5 w-20 bg-[var(--color-border)] rounded-full animate-pulse" />
            <div className="h-9 w-16 bg-[var(--color-border-subtle)] rounded-lg animate-pulse" />
          </div>
          <div className="px-4 py-3 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-2.5 w-24 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
                <div className="h-2.5 w-12 bg-[var(--color-border)] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <div className="h-8 bg-[var(--color-border-subtle)] rounded-[10px] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Mobile skeleton bottom sheet */}
      <div className="fixed bottom-0 inset-x-0 z-30 md:hidden">
        <div
          className="bg-[var(--color-bg-elevated)] rounded-t-[28px] px-5 pt-3 pb-8"
          style={{ boxShadow: "0 -4px 40px rgba(0,0,0,0.08)" }}
        >
          {/* Handle */}
          <div className="w-9 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-5" aria-hidden="true" />

          {/* Header row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-border-subtle)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-[var(--color-border)] rounded-full animate-pulse" />
              <div className="h-2.5 w-24 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`bg-[var(--color-border-subtle)] rounded-[14px] p-3 space-y-2 ${i === 2 ? 'col-span-2 flex flex-row items-center justify-between space-y-0' : ''}`}>
                <div className={`h-2.5 w-6 bg-[var(--color-border)] rounded-full animate-pulse ${i === 2 ? 'mb-0' : ''}`} />
                <div className="h-5 w-10 bg-[var(--color-border)] rounded animate-pulse" />
                <div className="h-2 w-8 bg-[var(--color-border-subtle)] rounded-full animate-pulse" />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <div className="flex-1 h-[52px] bg-[var(--color-border-subtle)] rounded-[var(--radius-button)] animate-pulse" />
            <div className="flex-1 h-[52px] bg-[var(--color-border-subtle)] rounded-[var(--radius-button)] animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
