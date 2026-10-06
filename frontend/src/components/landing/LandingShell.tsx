"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Droplet, Menu, Moon, Search, Sun, X } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { useProfile } from "@/context/AuthContext";
import { BubbleBackground } from "@/components/animate-ui/components/backgrounds/bubble";
import { CommandPalette, useCommandPalette } from "@/components/ui/CommandPalette";
import { NAV } from "./content";
import { btnPrimary, wrap } from "./styles";

const DARK_TOKENS = `
  --color-paper: oklch(14% 0.01 20);
  --color-paper-2: oklch(18% 0.01 20);
  --color-ink: oklch(96% 0.01 20);
  --color-ink-2: oklch(78% 0.01 20);
  --color-rule: oklch(28% 0.01 20);
  --color-muted: oklch(68% 0.01 20);
  --color-accent: oklch(52% 0.2 25);
  --color-accent-text: oklch(72% 0.16 22);
  --color-accent-ink: oklch(99% 0.005 20);
`;
const LIGHT_TOKENS = `
  --color-paper: oklch(99% 0.004 20);
  --color-paper-2: oklch(96.5% 0.006 20);
  --color-ink: oklch(20% 0.02 20);
  --color-ink-2: oklch(38% 0.02 20);
  --color-rule: oklch(88% 0.008 20);
  --color-muted: oklch(48% 0.015 20);
  --color-accent: oklch(52% 0.2 25);
  --color-accent-text: oklch(50% 0.2 25);
  --color-accent-ink: oklch(99% 0.005 20);
`;
const THEME_CSS = `
  .landing { ${DARK_TOKENS} color-scheme: dark; }
  @media (prefers-color-scheme: light) { .landing:not([data-theme="dark"]) { ${LIGHT_TOKENS} color-scheme: light; } }
  .landing[data-theme="light"] { ${LIGHT_TOKENS} color-scheme: light; }
  .landing[data-theme="dark"] { ${DARK_TOKENS} color-scheme: dark; }
  .landing { scroll-behavior: smooth; }
  .landing :is(h1, h2, h3, h4, h5, h6, summary) { color: var(--color-ink); }
  .landing :is(p, dt, dd, li, td, th) { color: inherit; }
  .landing .bubble-layer { opacity: 0.6; }
  @media (prefers-color-scheme: light) { .landing:not([data-theme="dark"]) .bubble-layer { opacity: 0.3; } }
  .landing[data-theme="light"] .bubble-layer { opacity: 0.3; }
  .landing[data-theme="dark"] .bubble-layer { opacity: 0.6; }
  .landing .glass { background-color: color-mix(in oklab, var(--color-paper-2) 70%, transparent); backdrop-filter: blur(12px); }
  @media (prefers-reduced-motion: reduce) { .landing { scroll-behavior: auto; } }
`;
const THEME_KEY = "bloodrelay-theme";

const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => { themeListeners.delete(cb); };
}
function getStoredTheme(): "light" | "dark" | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch { return null; }
}
function subscribeSystemTheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getSystemLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]";

export function LandingShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const { user } = useProfile();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, () => null);
  const systemLight = useSyncExternalStore(subscribeSystemTheme, getSystemLight, () => false);
  const resolvedTheme = theme ?? (systemLight ? "light" : "dark");

  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    themeListeners.forEach((l) => l());
  };

  const donorCta = user ? (
    <Link href="/dashboard" className={`${btnPrimary} !h-9 !px-4 !text-xs`}>Dashboard</Link>
  ) : (
    <Link href="/login" className={`${btnPrimary} !h-9 !px-4 !text-xs hidden sm:inline-flex`}>Become a donor</Link>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing min-h-[100dvh] flex flex-col font-sans antialiased selection:bg-red-500/30" data-theme={theme ?? undefined} style={{ backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
        <style>{THEME_CSS}</style>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-ink)] focus:text-[var(--color-paper)]">Skip to content</a>
        <BubbleBackground
          interactive
          aria-hidden="true"
          colors={{ first: "220,38,38", second: "153,27,27", third: "239,68,68", fourth: "127,29,29", fifth: "185,28,28", sixth: "248,113,113" }}
          className="bubble-layer !fixed inset-0 z-0 pointer-events-auto [contain:strict] [transform:translateZ(0)] bg-[var(--color-paper)]"
        />
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        <header className="sticky top-0 z-50 border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "color-mix(in oklab, var(--color-paper) 88%, transparent)", backdropFilter: "blur(12px)" }}>
          <div className={`${wrap} h-16 flex items-center justify-between gap-4`}>
            <Link href="/" className={`flex items-center gap-2 rounded ${focus}`}>
              <Droplet className="w-4 h-4" aria-hidden="true" style={{ color: "var(--color-accent-text)", fill: "var(--color-accent-text)" }} />
              <span className="text-sm font-bold tracking-widest uppercase">BloodAxis</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm" aria-label="Primary">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className={`rounded hover:text-[var(--color-ink)] transition-colors ${focus}`} style={{ color: "var(--color-ink-2)" }}>{n.label}</a>
              ))}
            </nav>

            <div className="flex items-center gap-2 text-sm">
              {user && (
                <button onClick={() => setCmdOpen(true)} className={`hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg border ${focus}`} style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}>
                  <Search className="w-3.5 h-3.5" aria-hidden="true" /><span>Search</span><kbd className="text-[10px] font-mono opacity-70">⌘K</kbd>
                </button>
              )}
              <Link href="/emergency" className={`h-9 px-4 rounded-lg border hidden sm:inline-flex items-center text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-paper-2)] ${focus}`} style={{ borderColor: "var(--color-ink-2)" }}>I need blood</Link>
              {donorCta}
              <button onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`} className={`w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-[var(--color-paper-2)] ${focus}`} style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }}>
                {resolvedTheme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button className={`md:hidden w-9 h-9 flex items-center justify-center rounded-lg ${focus}`} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <nav id="mobile-nav" className="md:hidden border-t px-5 py-5 flex flex-col gap-5" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper)" }} aria-label="Mobile">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className={`text-base rounded ${focus}`} style={{ color: "var(--color-ink-2)" }}>{n.label}</a>
              ))}
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/emergency" className={btnPrimary}>I need blood</Link>
                {!user && <Link href="/login" className="h-12 rounded-xl border inline-flex items-center justify-center text-sm font-bold uppercase tracking-wider" style={{ borderColor: "var(--color-ink-2)" }}>Become a donor</Link>}
              </div>
            </nav>
          )}
        </header>

        <main id="main" className="relative z-10 flex-1 w-full">{children}</main>
        <div className="relative z-10">{footer}</div>
      </div>
    </MotionConfig>
  );
}
