import { useInView } from "../hooks/useInView";

const STEPS = [
  {
    n: "01",
    title: "Identifiez votre véhicule",
    body: "Choisissez marque, modèle et année — ou prenez simplement une photo de votre voiture si vous n'êtes pas sûr.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Consultez les pièces disponibles",
    body: "On affiche les pièces compatibles en stock, avec prix et équivalences de marques alternatives.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Récupérez ou commandez",
    body: "Réservez en ligne et passez au magasin à Hammamet, ou demandez un devis envoyé directement sur WhatsApp.",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView();

  return (
    <section className="relative overflow-hidden bg-graphite">
      {/* Dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #F5C518 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
        aria-hidden="true"
      />
      {/* Gradient fade at edges */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-graphite via-transparent to-graphite" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
        {/* Section header */}
        <div className="mb-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-workshop/65">Le processus</p>
          <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-tight text-cream sm:text-4xl">
            Comment ça marche
          </h2>
          <div className="mx-auto mt-4 h-1 w-14 rounded-full bg-workshop" />
        </div>

        {/* Steps */}
        <div ref={ref} className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="group relative rounded-2xl border border-cream/8 bg-cream/[0.04] p-8 backdrop-blur-sm transition-all duration-300 hover:border-workshop/25 hover:bg-cream/[0.07]"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(32px)",
                transition: `opacity 0.7s ease ${i * 160}ms, transform 0.7s ease ${i * 160}ms, border-color 0.3s, background-color 0.3s`,
              }}
            >
              {/* Big number watermark */}
              <div className="mb-2 font-display text-8xl font-semibold leading-none text-workshop/8 select-none transition-all group-hover:text-workshop/14">
                {step.n}
              </div>

              {/* Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-workshop/10 text-workshop transition-all group-hover:bg-workshop group-hover:text-[#0A0A15]">
                {step.icon}
              </div>

              <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-cream">
                {step.title}
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-cream/50">{step.body}</p>

              {/* Gold accent bar */}
              <div className="mt-6 h-px w-10 bg-gradient-to-r from-workshop to-transparent transition-all duration-300 group-hover:w-20" />

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-2xl text-workshop/20 sm:block"
                  aria-hidden="true"
                >
                  ›
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <a
            href="#finder"
            className="inline-flex items-center gap-2 rounded-xl bg-workshop px-7 py-3.5 font-display text-sm font-semibold uppercase tracking-wide text-[#0A0A15] transition-all hover:bg-workshop/90 hover:shadow-[0_0_24px_rgba(245,197,24,0.35)]"
          >
            Trouver ma pièce maintenant
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
