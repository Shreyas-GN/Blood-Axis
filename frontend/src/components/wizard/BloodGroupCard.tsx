"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hoverScale } from "@/lib/motion";

interface BloodGroupCardProps {
  group: string;
  isSelected: boolean;
  onClick: () => void;
}

export function BloodGroupCard({ group, isSelected, onClick }: BloodGroupCardProps) {
  return (
    <motion.button
      onClick={onClick}
      {...hoverScale}
      animate={isSelected ? { y: -3 } : { y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex items-center justify-center",
        "h-[100px] rounded-[20px] border-2 transition-colors transition-shadow duration-[150ms]",
        "font-mono font-bold text-[1.625rem] select-none cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        isSelected
          ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--shadow-card-hover)]"
          : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card-hover)]"
      )}
      aria-pressed={isSelected}
    >
      {group}
      {isSelected && (
        <motion.div
          layoutId="blood-group-selected"
          className="absolute inset-0 rounded-[18px] ring-2 ring-[var(--color-blood)] ring-offset-0"
          initial={false}
        />
      )}
    </motion.button>
  );
}
