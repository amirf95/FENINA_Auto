import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Catalogue", href: "#catalogue" },
  { label: "Trouver ma pièce", href: "#finder" },
  { label: "Marques", href: "#brands" },
  { label: "Notre boutique", href: "#location" },
  { label: "Contact", href: "#contact" },
];

const LANGS = ["FR", "AR", "EN"] as const;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState<(typeof LANGS)[number]>("FR");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 text-cream ${
        scrolled
          ? "border-b border-cream/10 bg-[#0A0A15]/95 backdrop-blur-md shadow-xl shadow-black/30"
          : "border-b border-cream/5 bg-[#0A0A15]/70 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <a
          href="#top"
          className="group flex items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-workshop"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-workshop text-[#0A0A15] font-display font-bold text-base transition-all group-hover:scale-110 group-hover:shadow-[0_0_16px_rgba(245,197,24,0.5)]">
            F
          </div>
          <span className="font-display text-xl font-semibold uppercase tracking-wide transition-colors group-hover:text-workshop">
            Fenina
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-workshop/60 sm:block">
            Auto Parts
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group relative font-body text-sm font-medium text-cream/65 outline-none transition-colors hover:text-workshop focus-visible:text-workshop"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-workshop transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-4 lg:flex">
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-cream/35">
            {LANGS.map((l, i) => (
              <span key={l} className="flex items-center">
                <button
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`rounded px-1.5 py-0.5 outline-none transition-colors ${
                    lang === l ? "text-workshop" : "hover:text-cream"
                  }`}
                >
                  {l}
                </button>
                {i < LANGS.length - 1 && <span className="text-cream/15">/</span>}
              </span>
            ))}
          </div>
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-cream/20 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-cream/70 outline-none transition-all hover:border-cream/50 hover:text-cream focus-visible:ring-2 focus-visible:ring-cream"
          >
            Se connecter
          </a>
          <a
            href="#finder"
            className="rounded-lg bg-workshop px-5 py-2 font-display text-sm font-semibold uppercase tracking-wide text-[#0A0A15] outline-none transition-all hover:bg-workshop/90 hover:shadow-[0_0_20px_rgba(245,197,24,0.4)] focus-visible:ring-2 focus-visible:ring-cream"
          >
            Trouver ma pièce
          </a>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-workshop lg:hidden"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          <div className="flex flex-col gap-1.5">
            <span className={`block h-0.5 w-5 bg-cream transition-all duration-300 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-cream transition-all duration-300 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-cream transition-all duration-300 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <nav
        className={`overflow-hidden border-t border-cream/8 transition-all duration-300 ease-in-out lg:hidden ${
          menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 bg-[#0A0A15]/98 px-5 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 font-body text-sm font-medium text-cream/75 transition-all hover:bg-workshop/10 hover:text-workshop"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#finder"
            onClick={() => setMenuOpen(false)}
            className="mt-2 rounded-lg bg-workshop px-4 py-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-[#0A0A15]"
          >
            Trouver ma pièce
          </a>
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg border border-cream/20 px-4 py-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-cream/70 transition-all hover:border-cream/40 hover:text-cream"
          >
            Se connecter
          </a>
          <div className="mt-3 flex justify-center gap-1 border-t border-cream/10 pt-3 font-mono text-[11px] uppercase tracking-wider text-cream/35">
            {LANGS.map((l, i) => (
              <span key={l} className="flex items-center">
                <button onClick={() => setLang(l)} className={`px-1.5 py-0.5 ${lang === l ? "text-workshop" : ""}`}>{l}</button>
                {i < LANGS.length - 1 && <span className="text-cream/15">/</span>}
              </span>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
