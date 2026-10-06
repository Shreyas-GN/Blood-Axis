import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { AUDIENCES, COMPAT, FAQS, NAV, STEPS, WHY } from "./content";
import { btnPrimary, btnSecondary, h2, sectionY, wrap } from "./styles";

const rule = { borderColor: "var(--color-rule)" } as const;
const ink2 = { color: "var(--color-ink-2)" } as const;

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className={`border-t ${sectionY}`} style={rule}>
      <div className={`${wrap} max-w-[880px]`}>
        <h2 id="problem-title" className={`${h2} mb-8`}>Finding blood shouldn&apos;t depend on who you know.</h2>
        <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={ink2}>
          Today it means phone calls, group messages and hope. Hours disappear. Nobody knows who&apos;s coming. We replaced all of it with one thing that works.
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className={`border-t scroll-mt-16 ${sectionY}`} style={rule}>
      <div className={wrap}>
        <h2 id="how-title" className={`${h2} mb-16 max-w-2xl`}>Three steps. Under a minute to start.</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
          {STEPS.map((s) => (
            <li key={s.num}>
              <span className="block text-6xl font-semibold tabular-nums mb-6" style={{ color: "var(--color-accent-text)" }} aria-hidden="true">{s.num}</span>
              <h3 className="text-2xl font-semibold mb-3">{s.title}</h3>
              <p className="leading-relaxed" style={ink2}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Why() {
  return (
    <section id="why-bloodaxis" aria-labelledby="why-title" className={`border-t scroll-mt-16 ${sectionY}`} style={rule}>
      <div className={wrap}>
        <h2 id="why-title" className={`${h2} mb-16 max-w-2xl`}>Obsessed with what you&apos;ll never see.</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
          {WHY.map((w) => (
            <li key={w.title} className="border-t-2 pt-6" style={{ borderColor: "var(--color-accent)" }}>
              <h3 className="text-2xl font-semibold mb-3">{w.title}</h3>
              <p className="leading-relaxed" style={ink2}>{w.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function WhoItsFor() {
  return (
    <section id="who-its-for" aria-labelledby="who-title" className={`border-t scroll-mt-16 ${sectionY}`} style={rule}>
      <div className={wrap}>
        <h2 id="who-title" className={`${h2} mb-16 max-w-2xl`}>One network. Three people who need it.</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUDIENCES.map((a) => (
            <li key={a.tag} className="rounded-2xl border p-8 flex flex-col" style={{ ...rule, backgroundColor: "var(--color-paper-2)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "var(--color-muted)" }}>{a.tag}</p>
              <h3 className="text-2xl font-semibold mb-4">{a.title}</h3>
              <p className="leading-relaxed mb-8 flex-1" style={ink2}>{a.desc}</p>
              <Link href={a.href} className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]" style={{ color: "var(--color-accent-text)" }}>
                {a.cta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Compatibility() {
  return (
    <section id="compatibility" aria-labelledby="compat-title" className={`border-t scroll-mt-16 ${sectionY}`} style={rule}>
      <div className={`${wrap} max-w-[880px]`}>
        <h2 id="compat-title" className={`${h2} mb-8`}>You don&apos;t need to know who matches whom. We do.</h2>
        <p className="text-lg md:text-xl leading-relaxed max-w-2xl mb-10" style={ink2}>
          We only alert donors whose blood group works for the request. If you&apos;re curious, the chart is below.
        </p>
        <details className="group rounded-2xl border" style={rule}>
          <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 font-semibold rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
            Blood compatibility chart
            <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="overflow-x-auto border-t" style={rule}>
            <table className="w-full text-sm min-w-[520px]">
              <caption className="sr-only">Which blood groups can donate to and receive from each other</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                  <th scope="col" className="px-6 py-3 font-semibold">Blood group</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Can donate to</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Can receive from</th>
                </tr>
              </thead>
              <tbody>
                {COMPAT.map((r) => (
                  <tr key={r.group} className="border-t" style={rule}>
                    <th scope="row" className="px-6 py-3 text-left font-bold" style={{ color: "var(--color-accent-text)" }}>{r.group}</th>
                    <td className="px-6 py-3" style={ink2}>{r.gives}</td>
                    <td className="px-6 py-3" style={ink2}>{r.gets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={`border-t scroll-mt-16 ${sectionY}`} style={rule}>
      <div className={`${wrap} max-w-[880px]`}>
        <h2 id="faq-title" className={`${h2} mb-12`}>Questions, answered.</h2>
        <div className="border-b" style={rule}>
          {FAQS.map((f) => (
            <details key={f.q} className="group border-t" style={rule}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none py-6 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-6 leading-relaxed max-w-2xl" style={ink2}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className={`border-t ${sectionY}`} style={{ ...rule, backgroundColor: "var(--color-paper-2)" }}>
      <div className={`${wrap} text-center`}>
        <h2 id="cta-title" className={`${h2} mb-8 max-w-3xl mx-auto`}>Be the reason someone gets home tonight.</h2>
        <p className="text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10" style={ink2}>
          Join in under two minutes. Set your availability, and we&apos;ll only reach out when someone nearby needs your blood group.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className={btnPrimary}>Become a donor <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
          <Link href="/emergency" className={btnSecondary}>I need blood now</Link>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t py-12" style={rule}>
      <div className={`${wrap} flex flex-col gap-8 md:flex-row md:items-start md:justify-between`}>
        <div>
          <p className="font-bold tracking-widest uppercase text-sm">BloodAxis</p>
          <p className="mt-2 text-sm" style={ink2}>Emergency blood network.</p>
          <a href="mailto:support@bloodrelay.com" className="mt-4 inline-block text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]" style={ink2}>support@bloodrelay.com</a>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]" style={ink2}>{n.label}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
