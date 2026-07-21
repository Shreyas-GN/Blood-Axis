"use client";

import { cn } from "@/lib/utils";
import { StatusBadge, type UrgencyLevel } from "@/components/ui/StatusBadge";
import type { LucideIcon } from "lucide-react";

interface UrgencyCardProps {
  id: UrgencyLevel;
  label: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

export function UrgencyCard({
  id,
  label,
  description,
  icon: Icon,
  isSelected,
  onClick,
  colorClass,
  borderClass,
  bgClass,
}: UrgencyCardProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "w-full p-5 rounded-[var(--radius-card)] border-2 text-left transition-colors transition-shadow duration-[150ms]",
        "flex items-center gap-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blood)] focus-visible:ring-offset-2",
        isSelected
          ? `${borderClass} ${bgClass} shadow-[var(--shadow-card)]`
          : "border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)]"
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-[12px] flex items-center justify-center bg-[var(--color-bg-elevated)] shadow-sm shrink-0 transition-colors duration-[150ms]",
          isSelected ? colorClass : "text-[var(--color-base-400)]"
        )}
      >
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p
            className={cn(
              "font-bold text-[1.0625rem] transition-colors duration-[150ms]",
              isSelected ? "text-[var(--color-base-900)]" : "text-[var(--color-base-700)]"
            )}
          >
            {label}
          </p>
          {isSelected && <StatusBadge urgency={id} size="sm" hideIcon />}
        </div>
        <p className="text-[0.875rem] text-[var(--color-base-500)] leading-snug">
          {description}
        </p>
      </div>
    </button>
  );
}
