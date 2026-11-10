import { useRef } from "react";

export default function Footer() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  // Spotlight follows the pointer across the CTA banner; the CTA itself
  // drifts a few px toward the pointer (magnet). Both desktop-hover only,
  // both reset via the elements' own CSS transitions on leave.
  const onBannerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !bannerRef.current) return;
    const r = bannerRef.current.getBoundingClientRect();
    bannerRef.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    bannerRef.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const onCtaMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse" || !ctaRef.current) return;
    const r = ctaRef.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) * 0.28;
    const dy = (e.clientY - r.top - r.height / 2) * 0.28;
    ctaRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const onCtaLeave = () => { if (ctaRef.current) ctaRef.current.style.transform = ""; };

  return (
    <footer id="contact" className="bg-graphite text-cream">
      {/* CTA banner — the page's close */}
      <div
        ref={bannerRef}
        onPointerMove={onBannerMove}
        className="footer-spotlight relative overflow-hidden border-b border-cream/8 bg-workshop/5"
      >
        <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-cream">
                Besoin d'une pièce spécifique&nbsp;?
              </h3>
              <p className="mt-1 font-body text-sm text-cream/45">
                Contactez-nous sur WhatsApp pour un devis rapide.
              </p>
            </div>
            <a
              ref={ctaRef}
              onPointerMove={onCtaMove}
              onPointerLeave={onCtaLeave}
              href="https://wa.me/21620308848"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl bg-workshop px-6 py-3 font-display text-sm font-semibold uppercase tracking-wide text-[#0A0A15] transition-[transform,box-shadow] duration-150 ease-out hover:bg-workshop/90 hover:shadow-[0_0_20px_rgba(245,197,24,0.3)]"
              style={{ willChange: "transform" }}
            >
              Devis WhatsApp →
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-workshop text-[#0A0A15] font-display font-bold">
                F
              </div>
              <div>
                <p className="font-display text-lg font-semibold uppercase tracking-wide">Fenina</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-workshop/55 -mt-0.5">Auto Parts</p>
              </div>
            </div>
            <p className="font-body text-sm leading-relaxed text-cream/40 max-w-xs">
              Pièces auto neuves et alternatives pour toutes marques et modèles — Hammamet, Tunisie.
            </p>
          </div>

          <FooterColumn
            title="Boutique"
            links={[
              { label: "Catalogue", href: "#catalogue" },
              { label: "Trouver ma pièce", href: "#finder" },
              { label: "Marques", href: "#brands" },
              { label: "Promotions", href: "#" },
            ]}
          />
          <FooterColumn
            title="Compte"
            links={[
              { label: "Comptes garage", href: "#" },
              { label: "Historique commandes", href: "#" },
              { label: "Solde crédit", href: "#" },
              { label: "Support", href: "#" },
            ]}
          />

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-wider text-workshop">
              Nous trouver
            </h3>
            <ul className="space-y-3 font-body text-sm text-cream/45">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-workshop shrink-0">📍</span>
                <span>Hammamet, Nabeul<br />Tunisie</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-workshop shrink-0">📞</span>
                <a href="tel:+21620308848" className="transition-colors hover:text-cream">
                  +216 20 308 848
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-workshop shrink-0">🕐</span>
                <span>Lun–Sam, 8h–18h</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-2 border-t border-cream/8 pt-6 font-mono text-[11px] uppercase tracking-wider text-cream/22 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Fenina Auto Parts — Tous droits réservés</span>
          <span>Hammamet · Nabeul · TN</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-wider text-workshop">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="font-body text-sm text-cream/40 outline-none transition-colors hover:text-cream/75 focus-visible:text-workshop"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
