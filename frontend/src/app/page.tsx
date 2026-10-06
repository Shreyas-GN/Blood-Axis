"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Droplet, MapPin, ArrowRight, Shield, CheckCircle2, Heart, Zap, FileText, Users, Clock, Search, Bell, Lock, Map as MapIcon, Building2, ChevronDown, Menu, X, Activity, BadgeCheck, Smartphone, Sun, Moon } from "lucide-react";
import { useProfile } from "@/context/AuthContext";
const SignedIn = ({ children }: { children: React.ReactNode }) => { const { user } = useProfile(); return user ? <>{children}</> : null; };
const SignedOut = ({ children }: { children: React.ReactNode }) => { const { user } = useProfile(); return !user ? <>{children}</> : null; };
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityFeedPreview } from "@/components/landing/ActivityFeedPreview";
import { CommandPalette, useCommandPalette } from "@/components/ui/CommandPalette";
import { BubbleBackground } from "@/components/animate-ui/components/backgrounds/bubble";

// --- Hallmark Stamp ---
/* Hallmark · macrostructure: Stat-Led
 * theme: custom (bespoke) · vibe: "utilitarian mission-control meets urgent care" 
 * paper: oklch(14% 0.01 20) · accent: oklch(55% 0.18 20)
 * display: sans-serif · body: sans-serif · axes: dark / geometric-sans / chromatic-terracotta
 * gates: all-pass · studied: no
 */

// Theme tokens: dark by default, light via system preference or explicit toggle
const DARK_TOKENS = `
  --color-paper: oklch(14% 0.01 20);
  --color-paper-2: oklch(18% 0.01 20);
  --color-paper-3: oklch(22% 0.01 20);
  --color-ink: oklch(95% 0.01 20);
  --color-ink-2: oklch(75% 0.01 20);
  --color-rule: oklch(26% 0.01 20);
  --color-muted: oklch(60% 0.01 20);
  --color-accent: oklch(55% 0.18 20);
  --color-accent-ink: oklch(95% 0.01 20);
  --color-success: oklch(65% 0.15 150);
  --color-warning: oklch(75% 0.15 70);
`;
const LIGHT_TOKENS = `
  --color-paper: oklch(99% 0.004 20);
  --color-paper-2: oklch(96.5% 0.006 20);
  --color-paper-3: oklch(93% 0.008 20);
  --color-ink: oklch(20% 0.02 20);
  --color-ink-2: oklch(38% 0.02 20);
  --color-rule: oklch(88% 0.008 20);
  --color-muted: oklch(50% 0.015 20);
  --color-accent: oklch(52% 0.2 25);
  --color-accent-ink: oklch(98% 0.005 20);
  --color-success: oklch(55% 0.15 150);
  --color-warning: oklch(58% 0.15 70);
`;
const THEME_CSS = `
  .landing { ${DARK_TOKENS} --font-display: var(--font-display, 'Inter', sans-serif); --font-body: var(--font-body, 'Inter', sans-serif); --font-mono: var(--font-mono, 'JetBrains Mono', monospace); color-scheme: dark; }
  .landing :is(h1, h2, h3, h4, h5, h6) { color: var(--color-ink); }
  @media (prefers-color-scheme: light) { .landing:not([data-theme="dark"]) { ${LIGHT_TOKENS} color-scheme: light; } }
  .landing[data-theme="light"] { ${LIGHT_TOKENS} color-scheme: light; }
  .landing[data-theme="dark"] { ${DARK_TOKENS} color-scheme: dark; }
`;
const THEME_KEY = "bloodaxis-theme";

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

const ease = [0.16, 1, 0.3, 1] as const;
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function NumberTicker({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 40, stiffness: 60 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(target);
  }, [inView, target, mv]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

function RequestPreviewCard() {
  return (
    <div 
      className="w-full max-w-[380px] rounded-sm border group"
      style={{
        backgroundColor: "var(--color-paper-2)",
        borderColor: "var(--color-rule)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-success)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-success)" }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--color-ink-2)" }}>Live Request</span>
        </div>
        <StatusBadge status="searching" size="sm" />
      </div>
      <div className="p-4">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-sm flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform duration-300" 
               style={{ backgroundColor: "var(--color-paper-3)", color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
            O-
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--color-ink)" }}>O- Blood Needed</span>
              <StatusBadge urgency="IMMEDIATE" size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
              <MapPin className="w-3 h-3" />
              <span className="truncate">Apollo Hospital, Chennai</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-sm border" style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Distance</div>
            <div className="text-sm font-semibold font-mono" style={{ color: "var(--color-ink)" }}>1.4 km</div>
          </div>
          <div className="p-3 rounded-sm border" style={{ backgroundColor: "var(--color-paper-3)", borderColor: "var(--color-rule)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>Time Elapsed</div>
            <div className="text-sm font-semibold font-mono" style={{ color: "var(--color-warning)" }}>2m 14s</div>
          </div>
        </div>
        <button disabled className="w-full h-10 rounded-sm text-sm font-medium flex items-center justify-center gap-2 opacity-90 cursor-default"
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
          <Zap className="w-4 h-4 fill-current" /> Accept Request
        </button>
      </div>
    </div>
  );
}

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compatibility", label: "Compatibility" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  { num: "01", title: "Post a request", desc: "Choose blood group, units, hospital and urgency. It takes under a minute, with no account needed for emergencies.", icon: FileText },
  { num: "02", title: "We match donors nearby", desc: "Compatible, available donors within range are ranked by distance and alerted instantly by push notification.", icon: MapPin },
  { num: "03", title: "A donor accepts", desc: "The first donors to accept appear on your live tracker with distance and ETA, while everyone else is told it is covered.", icon: Bell },
  { num: "04", title: "Donate and close the loop", desc: "Contact opens only after acceptance. Mark the request fulfilled and the donor enters a safe cooldown period.", icon: CheckCircle2 },
];

const FEATURES = [
  { icon: Zap, title: "Instant geo-matching", desc: "A spatial matching engine finds compatible donors around the hospital in seconds, nearest first." },
  { icon: Bell, title: "Real-time alerts", desc: "Push notifications and live updates reach donors the moment a request that fits them is created." },
  { icon: MapIcon, title: "Live emergency map", desc: "See the hospital, responding donors and their distance on one map as the situation develops." },
  { icon: Lock, title: "Privacy by default", desc: "Donor identity and phone number stay hidden until they choose to accept a request." },
  { icon: BadgeCheck, title: "Verified donors", desc: "Phone-verified profiles with age checks and a record of past donations keep the network trustworthy." },
  { icon: Clock, title: "Cooldown protection", desc: "Donors are automatically paused after donating so nobody is alerted before they are medically ready." },
];

const COMPAT: { group: string; gives: string; gets: string }[] = [
  { group: "O−", gives: "Everyone", gets: "O−" },
  { group: "O+", gives: "O+, A+, B+, AB+", gets: "O−, O+" },
  { group: "A−", gives: "A−, A+, AB−, AB+", gets: "O−, A−" },
  { group: "A+", gives: "A+, AB+", gets: "O−, O+, A−, A+" },
  { group: "B−", gives: "B−, B+, AB−, AB+", gets: "O−, B−" },
  { group: "B+", gives: "B+, AB+", gets: "O−, O+, B−, B+" },
  { group: "AB−", gives: "AB−, AB+", gets: "O−, A−, B−, AB−" },
  { group: "AB+", gives: "AB+", gets: "Everyone" },
];

const FAQS = [
  { q: "Is Blood Axis free?", a: "Yes. Posting requests and registering as a donor are free for everyone. There are no fees for patients, families or donors." },
  { q: "Who can register as a donor?", a: "Anyone between 18 and 100 years old who is in good health. You verify your phone number, pick your blood group and location, and can switch availability on or off at any time." },
  { q: "How is my privacy protected?", a: "Requesters only see that a donor has accepted. Your name and contact details are shared only after you tap Accept, and you can pause alerts whenever you like." },
  { q: "How far away are donors alerted?", a: "The matching engine searches around the hospital and ranks compatible donors by distance, so the closest people are reached first." },
  { q: "Can hospitals use Blood Axis?", a: "Yes. Hospitals can verify their facility and manage requests from a dedicated dashboard." },
  { q: "Is this a replacement for a blood bank?", a: "No. Blood Axis complements blood banks by quickly reaching voluntary donors when stock is low or a rare group is needed urgently. In a medical emergency, always contact your hospital first." },
];

import { Faq4 } from "@/components/ui/faq-4";
import { Footer11 } from "@/components/ui/footer-11";

// Existing FAQS adapted for Faq4
const FAQ_ITEMS = FAQS.map((f, i) => ({
  id: `faq-${i}`,
  question: f.q,
  answer: f.a
}));

function SectionHeader({ eyebrow, title, sub, accent }: { eyebrow: string; title: string; sub?: string; accent?: boolean }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="max-w-3xl mb-14">
      <motion.span variants={fadeIn} className="text-xs font-bold uppercase tracking-widest block mb-4" style={{ color: accent ? "var(--color-accent)" : "var(--color-muted)" }}>{eyebrow}</motion.span>
      <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-medium leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>{title}</motion.h2>
      {sub && <motion.p variants={fadeIn} className="mt-5 text-base leading-relaxed max-w-2xl" style={{ color: "var(--color-ink-2)" }}>{sub}</motion.p>}
    </motion.div>
  );
}

const wrap = "w-full max-w-[1280px] mx-auto px-5 md:px-8";
const primaryBtn = "h-12 px-7 rounded-sm text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all";

export default function Home() {
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

  return (
    <div className="landing min-h-[100dvh] flex flex-col font-sans antialiased scroll-smooth selection:bg-red-500/30"
         data-theme={theme ?? undefined}
         style={{ backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}>
      <style>{THEME_CSS}</style>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "color-mix(in oklab, var(--color-paper) 88%, transparent)", backdropFilter: "blur(12px)" }}>
        <div className={`${wrap} h-16 flex items-center justify-between`}>
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <Droplet className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
            <span className="text-sm font-bold tracking-widest uppercase">Blood Axis</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm" aria-label="Primary">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-[var(--color-ink)] transition-colors" style={{ color: "var(--color-ink-2)" }}>{n.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <SignedIn>
              <button onClick={() => setCmdOpen(true)} className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-sm border" style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)", backgroundColor: "var(--color-paper-2)" }}>
                <Search className="w-3.5 h-3.5" /><span>Search</span><kbd className="text-[10px] font-mono opacity-60">⌘K</kbd>
              </button>
              <Link href="/dashboard" className="h-9 px-4 rounded-sm flex items-center text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>Dashboard</Link>
            </SignedIn>
            <SignedOut>
              <Link href="/login" className="hidden sm:block font-medium hover:opacity-80" style={{ color: "var(--color-ink-2)" }}>Sign in</Link>
              <Link href="/login" className="h-9 px-4 rounded-sm flex items-center text-xs font-bold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>Become a donor</Link>
            </SignedOut>
            <button onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`} title="Toggle theme"
                    className="relative w-9 h-9 rounded-sm border flex items-center justify-center hover:bg-[var(--color-paper-2)] transition-colors"
                    style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }}>
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="md:hidden p-1" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t px-5 py-4 flex flex-col gap-4 text-sm" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper)" }} aria-label="Mobile">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} style={{ color: "var(--color-ink-2)" }}>{n.label}</a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 w-full flex flex-col">
        {/* Hero */}
        <section className="border-b relative" style={{ borderColor: "var(--color-rule)" }}>
          <BubbleBackground 
            interactive={true}
            colors={{
              first: '220,38,38',
              second: '153,27,27',
              third: '239,68,68',
              fourth: '127,29,29',
              fifth: '185,28,28',
              sixth: '248,113,113',
            }}
            className="w-full bg-[var(--color-paper)]"
          >
            <div className={`${wrap} relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-14 items-center`}>
              <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-7">
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8 text-xs font-medium backdrop-blur-md" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-2)", backgroundColor: "color-mix(in oklab, var(--color-paper-2) 60%, transparent)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--color-success)" }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-success)" }} />
                  </span>
                  Emergency blood network · live now
                </motion.div>
                <motion.h1 variants={fadeIn} className="font-medium leading-[1.05] tracking-tight mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
                  Find a blood donor near you, <span style={{ color: "var(--color-accent)" }}>in minutes.</span>
                </motion.h1>
                <motion.p variants={fadeIn} className="text-lg leading-relaxed mb-10 max-w-xl" style={{ color: "var(--color-ink-2)" }}>
                  Blood Axis connects patients, families and hospitals with verified donors nearby in real time. Post a request, nearby matching donors are alerted instantly, and you track who is on the way.
                </motion.p>
                <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Link href="/emergency" className={primaryBtn} style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>
                    Request blood <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/login" className={`${primaryBtn} border backdrop-blur-md hover:bg-[color-mix(in_oklab,var(--color-paper-2)_80%,transparent)]`} style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)", backgroundColor: "color-mix(in oklab, var(--color-paper-2) 40%, transparent)" }}>
                    Register as donor
                  </Link>
                </motion.div>
                <motion.ul variants={fadeIn} className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-mono tracking-wider uppercase backdrop-blur-sm p-3 rounded-lg -ml-3" style={{ color: "var(--color-ink-2)", backgroundColor: "color-mix(in oklab, var(--color-paper-2) 20%, transparent)" }}>
                  <li className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Private by default</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Free for everyone</li>
                  <li className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Works on any phone</li>
                </motion.ul>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease }} className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="backdrop-blur-xl rounded-sm p-1 shadow-2xl bg-white/5 border border-white/10 relative z-10 w-full max-w-[380px] overflow-hidden">
                   <div className="absolute inset-0 bg-[var(--color-paper-2)] opacity-80" />
                   <div className="relative z-20">
                     <RequestPreviewCard />
                   </div>
                </div>
              </motion.div>
            </div>
          </BubbleBackground>
        </section>

        {/* Stats band */}
        <section className="border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
          <div className={`${wrap} py-10 grid grid-cols-2 md:grid-cols-4 gap-8`}>
            {[
              { v: 4200, s: "+", l: "Requests supported" },
              { v: 18700, s: "+", l: "Registered donors" },
              { v: 8, s: " min", l: "Avg. time to first accept" },
              { v: 8, s: "", l: "Blood groups covered" },
            ].map((x) => (
              <div key={x.l}>
                <div className="text-3xl md:text-4xl font-mono font-bold mb-1"><NumberTicker target={x.v} suffix={x.s} /></div>
                <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>{x.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section className="border-b" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24`}>
            <SectionHeader eyebrow="The problem" title="Finding blood shouldn't depend on who you know." sub="When a patient needs blood urgently, families spend precious hours calling contacts and posting on social media. Blood Axis replaces that scramble with one coordinated, trusted system." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Clock, t: "Hours lost searching", d: "Phone chains and group messages are slow, unreliable and hard to verify." },
                { icon: Users, t: "Donors don't know who needs them", d: "Willing donors nearby are never reached because there is no live signal of demand." },
                { icon: Activity, t: "No visibility once asked", d: "Families can't tell who is coming, how far away they are or whether the need is already met." },
              ].map((x) => (
                <div key={x.t} className="p-6 rounded-sm border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
                  <x.icon className="w-5 h-5 mb-5" style={{ color: "var(--color-accent)" }} />
                  <h3 className="text-base font-medium mb-2">{x.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b scroll-mt-16" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24`}>
            <SectionHeader eyebrow="How it works" title="From request to donor in four steps." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border" style={{ borderColor: "var(--color-rule)" }}>
              {STEPS.map((step, idx) => (
                <motion.div key={step.num} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={fadeIn}
                            className={`p-8 ${idx !== STEPS.length - 1 ? "border-b lg:border-b-0 lg:border-r" : ""} ${idx % 2 === 0 && idx !== STEPS.length - 1 ? "md:border-r" : ""}`} style={{ borderColor: "var(--color-rule)" }}>
                  <div className="flex justify-between items-start mb-8">
                    <step.icon className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
                    <span className="font-mono text-xl font-bold" style={{ color: "var(--color-muted)" }}>{step.num}</span>
                  </div>
                  <h3 className="text-lg font-medium mb-3">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b scroll-mt-16" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24`}>
            <SectionHeader eyebrow="Features" title="Built for speed, safety and trust." sub="Everything a patient, donor or hospital needs during a blood emergency, in one place." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="p-6 rounded-sm border transition-colors hover:border-[var(--color-muted)]" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{ backgroundColor: "var(--color-paper-3)" }}>
                    <f.icon className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h3 className="text-base font-medium mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live activity */}
        <section className="border-b" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center`}>
            <div className="lg:col-span-5">
              <SectionHeader eyebrow="Live network" title="See the network respond in real time." sub="Requests, acceptances and fulfilled donations stream across cities as they happen." />
              <Link href="/activity" className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80" style={{ color: "var(--color-accent)" }}>
                View live activity <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="lg:col-span-6 lg:col-start-7"><ActivityFeedPreview /></div>
          </div>
        </section>

        {/* Audiences */}
        <section className="border-b" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24`}>
            <SectionHeader eyebrow="Who it's for" title="One platform, three ways to help." />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                { icon: Heart, tag: "Patients & families", title: "Get help fast", pts: ["Post a request in under a minute", "Track responding donors live on a map", "Edit or close the request any time"], cta: "Request blood", href: "/emergency" },
                { icon: Droplet, tag: "Donors", title: "Give when it matters", pts: ["One tap to accept, no commitment before", "Identity hidden until you accept", "Turn availability on or off whenever"], cta: "Become a donor", href: "/login" },
                { icon: Building2, tag: "Hospitals", title: "Coordinate at scale", pts: ["Verify your facility", "Manage incoming and active requests", "Reach donors beyond your own registry"], cta: "Hospital portal", href: "/hospital/verify" },
              ].map((a) => (
                <div key={a.tag} className="p-8 rounded-sm border flex flex-col" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-paper-2)" }}>
                  <a.icon className="w-6 h-6 mb-6" style={{ color: "var(--color-accent)" }} />
                  <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>{a.tag}</span>
                  <h3 className="text-xl font-medium mb-5">{a.title}</h3>
                  <ul className="space-y-3 mb-8 flex-1">
                    {a.pts.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-sm" style={{ color: "var(--color-ink-2)" }}>
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />{p}
                      </li>
                    ))}
                  </ul>
                  <Link href={a.href} className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all">{a.cta} <ArrowRight className="w-4 h-4" /></Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compatibility */}
        <section id="compatibility" className="border-b scroll-mt-16" style={{ borderColor: "var(--color-rule)" }}>
          <div className={`${wrap} py-20 md:py-24`}>
            <SectionHeader eyebrow="Blood compatibility" title="Who can give to whom." sub="Matching only alerts donors whose blood group is compatible with the request." />
            <div className="overflow-x-auto border rounded-sm" style={{ borderColor: "var(--color-rule)" }}>
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-muted)" }} className="text-left text-xs uppercase tracking-widest">
                    <th className="px-5 py-3 font-semibold">Blood group</th>
                    <th className="px-5 py-3 font-semibold">Can donate to</th>
                    <th className="px-5 py-3 font-semibold">Can receive from</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPAT.map((r) => (
                    <tr key={r.group} className="border-t" style={{ borderColor: "var(--color-rule)" }}>
                      <td className="px-5 py-3 font-mono font-bold" style={{ color: "var(--color-accent)" }}>{r.group}</td>
                      <td className="px-5 py-3" style={{ color: "var(--color-ink-2)" }}>{r.gives}</td>
                      <td className="px-5 py-3" style={{ color: "var(--color-ink-2)" }}>{r.gets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ - Using Watermelon component */}
        <div id="faq" className="scroll-mt-16 w-full max-w-[1280px] mx-auto relative border-b" style={{ borderColor: "var(--color-rule)" }}>
           <Faq4
             badge="Support"
             title="Questions, answered."
             description="Find out how Blood Axis works, how privacy is protected, and who can use the platform."
             faqs={FAQ_ITEMS}
             className="pb-24 pt-16"
           />
        </div>

        {/* Final CTA */}
        <section style={{ backgroundColor: "var(--color-paper-2)" }}>
          <div className={`${wrap} py-20 md:py-28 text-center`}>
            <h2 className="text-4xl md:text-5xl font-medium leading-tight mb-6 max-w-3xl mx-auto" style={{ fontFamily: "var(--font-display)" }}>
              Be the reason someone gets home tonight.
            </h2>
            <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: "var(--color-ink-2)" }}>Join the network in under two minutes. Set your availability and we&apos;ll only reach out when someone nearby needs your blood group.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className={primaryBtn} style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}>Register as donor <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/emergency" className={`${primaryBtn} border`} style={{ borderColor: "var(--color-rule)" }}>I need blood now</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Using Watermelon component */}
      <div className="border-t" style={{ borderColor: "var(--color-rule)" }}>
         <Footer11 
           badgeText="Emergency Network"
           heading="Have questions or want to partner with us as a hospital?"
           contactLabel="Reach out at:"
           contactEmail="support@bloodrelay.com"
           contactEmailHref="mailto:support@bloodrelay.com"
           brandName="Blood Axis"
           navLinks={NAV}
           brandLogo={
             <div className="flex items-center justify-center">
                <Droplet className="w-16 h-16 lg:w-24 lg:h-24" style={{ color: "var(--color-accent)", fill: "var(--color-accent)", opacity: 0.2 }} />
             </div>
           }
         />
      </div>
    </div>
  );
}
