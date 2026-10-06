import { type Transition, type Variants } from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   BloodRelay Motion Config
   Philosophy: Explain change, never entertain.
   Timing: 150–400ms only. No bounce. No elastic springs.
   Easing: ease-out (cubic-bezier(0.16, 1, 0.3, 1)) — Linear-style
   ───────────────────────────────────────────────────────────── */

// ── Base transition curves ───────────────────────────────────

export const easeDefault: Transition["ease"] = [0.16, 1, 0.3, 1];

export const fastTransition: Transition = {
  duration: 0.15,
  ease: easeDefault,
};

export const defaultTransition: Transition = {
  duration: 0.25,
  ease: easeDefault,
};

export const slowTransition: Transition = {
  duration: 0.4,
  ease: easeDefault,
};

// ── Entrance variants ────────────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: defaultTransition },
  exit: { opacity: 0, transition: fastTransition },
};

export const slideUpFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: defaultTransition },
  exit: { opacity: 0, y: 4, transition: fastTransition },
};

export const slideDownFade: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: defaultTransition },
  exit: { opacity: 0, y: -4, transition: fastTransition },
};

// Scale in from 97% — for modals, command palette, sheets
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: defaultTransition },
  exit: { opacity: 0, scale: 0.97, transition: fastTransition },
};

// ── Stagger container ────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
};

// ── Pulse breathing ──────────────────────────────────────────
// For Mission Status Card (searching state), live indicators.
// Slow, calm, alive — NOT urgent or alarming.
export const pulseBreath: Variants = {
  rest: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.015, 1],
    opacity: [1, 0.82, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
};

// ── Hover interactions ───────────────────────────────────────
// Apply as motion props: whileHover, whileTap

export const hoverScale = {
  whileHover: { scale: 1.01, transition: fastTransition },
  whileTap: { scale: 0.99, transition: fastTransition },
} as const;

export const hoverLift = {
  whileHover: {
    scale: 1.01,
    y: -2,
    transition: fastTransition,
  },
  whileTap: {
    scale: 0.99,
    y: 0,
    transition: fastTransition,
  },
} as const;

// ── Timeline stage transition ────────────────────────────────
// Used in EmergencyTimeline — stage line grows downward

export const timelineLine: Variants = {
  hidden: { scaleY: 0, originY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.4, ease: easeDefault },
  },
};

export const timelineDot: Variants = {
  inactive: { scale: 1, opacity: 0.3 },
  active: {
    scale: [1, 1.2, 1],
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: easeDefault,
    },
  },
  complete: { scale: 1, opacity: 1, transition: defaultTransition },
};

// ── Sheet / drawer ───────────────────────────────────────────

export const sheetSlideUp: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: easeDefault },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: easeDefault },
  },
};
