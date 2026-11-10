import type { ReactElement } from "react";
import { useInView } from "../hooks/useInView";
import CarBlueprint from "./CarBlueprint";

type Category = { name: string; code: string; icon: ReactElement };

const ICON_PROPS = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const CATEGORIES: Category[] = [
  {
    name: "Freinage",
    code: "FRN",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
      </svg>
    ),
  },
  {
    name: "Moteur",
    code: "MTR",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="8" width="12" height="9" rx="1" />
        <path d="M7 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M16 11h3v3h-3M9 11v3M13 11v3" />
      </svg>
    ),
  },
  {
    name: "Suspension",
    code: "SUS",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 4l3 3-3 3 3 3-3 3 3 3M17 4v16" />
        <circle cx="17" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Filtres",
    code: "FLT",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />
      </svg>
    ),
  },
  {
    name: "Électrique",
    code: "ELC",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M13 3 6 13h5l-1 8 7-10h-5l1-8z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Carrosserie",
    code: "CRS",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 12l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5M3 12v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M3 12h18" />
        <circle cx="7.5" cy="15" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="15" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Éclairage",
    code: "ECL",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 18h6M10 21h4M8 13a4 4 0 1 1 8 0c0 1.5-.7 2.4-1.4 3.1-.4.4-.6.6-.6 1.4H10c0-.8-.2-1-.6-1.4C8.7 15.4 8 14.5 8 13z" />
      </svg>
    ),
  },
  {
    name: "Refroidissement",
    code: "RFR",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 2v20M2 7l10 5 10-5M2 17l10-5 10 5" />
      </svg>
    ),
  },
];

export default function Categories() {
  const { ref, inView } = useInView();

  return (
    <section id="catalogue" className="bg-[#0A0A15]">
      <CarBlueprint />
      <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-steel">
              Parcourir par catégorie
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold uppercase tracking-tight text-graphite sm:text-4xl">
              Le catalogue
            </h2>
            <div className="mt-3 h-1 w-14 rounded-full bg-workshop" />
          </div>
          <a
            href="#"
            className="hidden items-center gap-1.5 rounded-xl border border-graphite/15 px-4 py-2 font-body text-sm font-medium text-graphite/60 outline-none transition-all hover:border-graphite/40 hover:text-graphite sm:inline-flex"
          >
            Toutes les catégories <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* Grid */}
        <div ref={ref} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat, i) => (
            <a
              key={cat.code}
              href="#"
              className="group flex flex-col gap-4 rounded-2xl border border-haze bg-white p-5 outline-none transition-all duration-300 hover:-translate-y-1.5 hover:border-workshop/25 hover:shadow-xl hover:shadow-workshop/8 focus-visible:ring-2 focus-visible:ring-workshop"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(28px)",
                transition: `opacity 0.6s ease ${i * 55}ms, transform 0.6s ease ${i * 55}ms, box-shadow 0.3s, border-color 0.3s, translate 0.3s`,
              }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-graphite text-workshop transition-all duration-300 group-hover:bg-workshop group-hover:text-[#0A0A15] group-hover:shadow-[0_0_16px_rgba(245,197,24,0.35)]">
                {cat.icon}
              </span>
              <div>
                <span className="block font-body text-sm font-semibold text-graphite transition-colors group-hover:text-graphite">
                  {cat.name}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-steel/60">
                  {cat.code}
                </span>
              </div>
              <div className="mt-auto h-px w-0 bg-gradient-to-r from-workshop to-transparent transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <a
          href="#"
          className="mt-8 block text-center font-body text-sm font-medium text-graphite/55 transition-colors hover:text-graphite sm:hidden"
        >
          Toutes les catégories →
        </a>
      </div>
      </div>
    </section>
  );
}
