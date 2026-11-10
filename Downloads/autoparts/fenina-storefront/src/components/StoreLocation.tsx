import { useInView } from "../hooks/useInView";

export default function StoreLocation() {
  const { ref, inView } = useInView();

  return (
    <section id="location" className="relative overflow-hidden bg-[#0A0A15]">
      {/* Blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,197,24,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-garage/8 blur-[100px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
        {/* Section header */}
        <div className="mb-12 text-center text-cream">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-workshop/65">Notre boutique</p>
          <h2 className="mt-2 font-display text-3xl font-semibold uppercase tracking-tight sm:text-4xl">
            Nous trouver
          </h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-workshop" />
        </div>

        {/* Content grid */}
        <div
          ref={ref}
          className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-stretch"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(32px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {/* Info card */}
          <div className="flex flex-col rounded-2xl border border-cream/10 bg-cream/[0.04] p-8 backdrop-blur-sm text-cream">
            {/* Brand */}
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-workshop text-[#0A0A15] font-display font-bold text-base">F</div>
                <div>
                  <p className="font-display text-lg font-semibold uppercase tracking-wide">Fenina Auto Parts</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-workshop/60 -mt-0.5">Hammamet · Tunisie</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-workshop/40 to-transparent" />
            </div>

            {/* Info rows */}
            <div className="flex flex-col gap-5 flex-1">
              <InfoRow icon={<MapPinIcon />} label="Adresse">
                <p className="font-body text-sm text-cream/65 leading-relaxed">
                  Hammamet, Nabeul<br />Tunisie
                </p>
              </InfoRow>
              <InfoRow icon={<ClockIcon />} label="Horaires d'ouverture">
                <p className="font-body text-sm text-cream/65 leading-relaxed">
                  Lundi – Samedi<br />8h00 – 18h00
                </p>
              </InfoRow>
              <InfoRow icon={<PhoneIcon />} label="Téléphone">
                <a
                  href="tel:+21620308848"
                  className="font-body text-sm text-workshop transition-colors hover:text-workshop/75"
                >
                  +216 20 308 848
                </a>
              </InfoRow>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3">
              <a
                href="https://wa.me/21620308848"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 font-display text-sm font-semibold uppercase tracking-wide text-white transition-all hover:bg-[#22C05A] hover:shadow-lg hover:shadow-[#25D366]/25"
              >
                <WhatsAppIcon />
                Contacter sur WhatsApp
              </a>
              <a
                href="tel:+21620308848"
                className="flex items-center justify-center gap-2 rounded-xl border border-cream/12 py-3 font-display text-sm font-medium uppercase tracking-wide text-cream/60 transition-all hover:border-cream/25 hover:text-cream"
              >
                <PhoneIcon />
                Appeler maintenant
              </a>
            </div>
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-2xl border border-cream/10 min-h-[380px]">
            <iframe
              title="Fenina Auto Parts – Hammamet, Tunisie"
              src="https://maps.google.com/maps?q=36.4072253,10.6224798&z=17&output=embed"
              width="100%"
              height="100%"
              style={{
                minHeight: "380px",
                border: 0,
                display: "block",
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-workshop/10 text-workshop">
        {icon}
      </div>
      <div>
        <p className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-cream/30">{label}</p>
        {children}
      </div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.18 19.79 19.79 0 0 1 1.61 4.6a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.38-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
