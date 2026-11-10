import { useState, useEffect, useRef } from "react";
import GearSVG from "./Icons/Gearsvg";
import CameraIcon from "./Icons/CameraIcon";
import SelectField from "./SelectField";
import { usePrefersReducedMotion } from "../hooks/useScrollProgress";
import { API_BASE } from "../lib/api";
import { showErrorToast, showSuccessToast } from "../lib/alerts";

// Parses "5 000+" -> { target: 5000, suffix: "+" }, "10 ans" -> { target: 10, suffix: " ans" }
// The space only belongs to the number when it separates thousands (another
// digit group follows); otherwise it belongs to the suffix, as in "10 ans".
function parseStat(value: string) {
  const digits = value.match(/^\d{1,3}(?:\s\d{3})*/)?.[0] ?? "0";
  const target = parseInt(digits.replace(/\s/g, ""), 10) || 0;
  const suffix = value.slice(digits.length);
  return { target, suffix };
}

function CountUpStat({ value, active }: { value: string; active: boolean }) {
  const { target, suffix } = parseStat(value);
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active || reduced) return; // nothing to animate; render shows `target` directly below
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduced]);

  const shown = active && !reduced ? display : target;
  return <>{shown.toLocaleString("fr-FR")}{suffix}</>;
}

type FinderMode = "vehicle" | "photo";

const YEARS = Array.from({ length: 22 }, (_, i) => 2024 - i);

type VehicleDataStatus = "loading" | "ready" | "error";

const STATS = [
  { value: "5 000+", label: "Pièces en stock" },
  { value: "20+", label: "Marques partenaires" },
  { value: "10 ans", label: "D'expérience" },
  { value: "98%", label: "Satisfaction" },
];

const TRUST = ["Livraison rapide", "Pièces garanties", "Conseil expert", "Devis WhatsApp"];

export default function Hero() {
  const [mode, setMode] = useState<FinderMode>("vehicle");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [vehicleData, setVehicleData] = useState<Record<string, string[]>>({});
  const [vehicleDataStatus, setVehicleDataStatus] = useState<VehicleDataStatus>("loading");
  const reduced = usePrefersReducedMotion();
  const gearFarRef = useRef<HTMLDivElement>(null);
  const gearNearRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // Brand/model list for the vehicle finder, pulled from the car_brands_and_models
  // table (seeded from the VehiclesDB open dataset) instead of a hardcoded list.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/vehicles/car-brands-models/`)
      .then((res) => {
        if (!res.ok) throw new Error(`car-brands-models: ${res.status}`);
        return res.json() as Promise<Record<string, string[]>>;
      })
      .then((data) => {
        if (cancelled) return;
        setVehicleData(data);
        setVehicleDataStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setVehicleDataStatus("error");
        showErrorToast("Impossible de charger les marques et modèles.");
      });
    return () => { cancelled = true; };
  }, []);

  // Depth parallax on the decorative gears and glow: background layers drift
  // slower than the fold, foreground content stays put. devices.md's rates
  // are in hundreds of px; kept small since these sit behind readable text.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (gearFarRef.current) gearFarRef.current.style.transform = `translateY(${y * 0.12}px)`;
        if (gearNearRef.current) gearNearRef.current.style.transform = `translateY(${y * -0.08}px)`;
        if (orbRef.current) orbRef.current.style.transform = `translateY(${y * 0.18}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [reduced]);

  const canSearch = mode === "vehicle" ? Boolean(make && model && year) : Boolean(photoName);
  const makes = Object.keys(vehicleData);

  const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after a rejection
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showErrorToast("Ce fichier n'est pas une image. Utilisez un JPG ou PNG.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showErrorToast("Photo trop lourde (8 Mo max).");
      return;
    }
    setPhotoName(file.name);
    showSuccessToast("Photo ajoutée.");
  };
  const makePlaceholder =
    vehicleDataStatus === "loading" ? "Chargement..." :
    vehicleDataStatus === "error" ? "Indisponible" :
    "Sélectionner";

  return (
    <section id="top" className="relative overflow-hidden bg-[#0A0A15] text-white">
      {/* Radial glow orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          ref={orbRef}
          className="absolute -top-32 left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-workshop/6 blur-[130px]"
          style={{ animation: "pulse 5s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-48 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-garage/8 blur-[110px]"
          style={{ animation: "pulse 7s ease-in-out infinite", animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 -right-24 h-[350px] w-[350px] rounded-full bg-blue-900/15 blur-[90px]" />
      </div>

      {/* Blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,197,24,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.045) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
        aria-hidden="true"
      />

      {/* Diagonal stripe accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, #F5C518 0 1px, transparent 1px 56px)",
        }}
        aria-hidden="true"
      />

      {/* Rotating gear – top right */}
      <div
        ref={gearFarRef}
        className="pointer-events-none absolute right-4 top-4 opacity-[0.07] animate-spin-slow"
        style={{ animationDuration: "38s" }}
        aria-hidden="true"
      >
        <GearSVG size={280} />
      </div>

      {/* Small gear – bottom left */}
      <div
        ref={gearNearRef}
        className="pointer-events-none absolute -left-10 bottom-4 opacity-[0.04] animate-spin-slow"
        style={{ animationDuration: "55s", animationDirection: "reverse" }}
        aria-hidden="true"
      >
        <GearSVG size={180} />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

          {/* ── LEFT ── */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(36px)",
              transition: "opacity 0.9s ease, transform 0.9s ease",
            }}
          >
            {/* Live badge */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-workshop/25 bg-workshop/8 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-workshop animate-pulse-slow" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-workshop">
                Hammamet · Pièces auto neuves &amp; alternatives
              </span>
            </div>

            <h1 className="font-display text-5xl text-white font-semibold uppercase leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem]">
              <span className="block overflow-hidden">
                <span
                  className="block"
                  style={{
                    transform: mounted ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) 120ms",
                  }}
                >
                  La bonne pièce,
                </span>
              </span>
              <span className="block overflow-hidden">
                <span
                  className="text-gradient block"
                  style={{
                    transform: mounted ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) 260ms",
                  }}
                >
                  trouvée simplement.
                </span>
              </span>
            </h1>

            <p className="mt-6 max-w-lg font-body text-base leading-relaxed text-white/55 lg:text-lg">
              Vous ne connaissez pas le modèle exact ou l'année de votre voiture&nbsp;?
              Prenez une photo ou indiquez votre véhicule:  on vous montre les pièces disponibles en stock.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/8 bg-white/4 p-4 transition-all hover:border-workshop/30 hover:bg-workshop/5"
                  style={{
                    opacity: mounted ? 1 : 0,
                    filter: mounted ? "blur(0px)" : "blur(6px)",
                    transform: mounted ? "translateY(0)" : "translateY(16px)",
                    transition: `opacity 0.5s ease-out ${300 + i * 90}ms, filter 0.5s ease-out ${300 + i * 90}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${300 + i * 90}ms`,
                  }}
                >
                  <div className="font-display text-2xl font-semibold text-workshop">
                    <CountUpStat value={stat.value} active={mounted} />
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/35">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Trust pills */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {TRUST.map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-white/45">
                  <svg className="h-3.5 w-3.5 shrink-0 text-workshop" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-body text-sm">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: finder card ── */}
          <div
            className="relative"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(40px)",
              transition: "opacity 0.9s ease 350ms, transform 0.9s ease 350ms",
            }}
          >
            {/* Glow behind card */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-workshop/12 blur-3xl" aria-hidden="true" />

            <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl lg:p-8">
              {/* Card header */}
              <div className="mb-5 flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-workshop/65 mb-0.5">Recherche rapide</p>
                  <h2 className="font-display text-base font-semibold uppercase tracking-wide text-white">Trouver ma pièce</h2>
                </div>
                <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-xs text-white/25">#FENINA</span>
              </div>

              {/* Mode toggle */}
              <div
                role="tablist"
                aria-label="Méthode de recherche"
                className="mb-5 flex gap-1 rounded-xl border border-white/8 bg-black/30 p-1"
              >
                {(["vehicle", "photo"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg px-3 py-2.5 font-body text-sm font-medium outline-none transition-all duration-200 ${
                      mode === m
                        ? "bg-workshop text-[#0A0A15] shadow-md shadow-workshop/25"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    {m === "vehicle" ? "Mon véhicule" : "Photo"}
                  </button>
                ))}
              </div>

              {/* Fields */}
              {mode === "vehicle" ? (
                
                <div className="space-y-3">
                  <SelectField
                    label="Marque"
                    value={make}
                    placeholder={makePlaceholder}
                    options={makes}
                    onChange={(v) => { setMake(v); setModel(""); }}
                    disabled={vehicleDataStatus !== "ready"}
                  />
                  <SelectField
                    label="Modèle"
                    value={model}
                    placeholder={make ? "Sélectionner" : "Choisir une marque d'abord"}
                    options={make ? vehicleData[make] ?? [] : []}
                    onChange={setModel}
                    disabled={!make}
                  />
                  <SelectField
                    label="Année"
                    value={year}
                    placeholder="Sélectionner"
                    options={YEARS.map(String)}
                    onChange={setYear}
                    disabled={!model}
                  />
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/15 bg-white/3 px-4 py-10 text-center transition-all hover:border-workshop/50 hover:bg-workshop/5">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/8">
                    <CameraIcon />
                  </div>
                  <span className="font-display text-sm uppercase tracking-wide text-white/80">
                    {photoName ?? "Ajouter une photo"}
                  </span>
                  <span className="font-body text-xs text-white/35">
                    JPG ou PNG · Identification automatique marque / modèle
                  </span>
                </label>
              )}

              <button
                disabled={!canSearch}
                className="mt-5 w-full rounded-xl bg-workshop py-3.5 font-display text-sm font-semibold uppercase tracking-widest text-[#0A0A15] outline-none transition-all hover:bg-workshop/90 hover:shadow-[0_0_30px_rgba(245,197,24,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:shadow-none"
              >
                Rechercher les pièces →
              </button>

              <p className="mt-3 text-center font-body text-xs text-white/25">
                {canSearch
                  ? "Affiche les pièces compatibles disponibles en stock."
                  : mode === "vehicle"
                  ? "Renseignez les 3 champs pour lancer la recherche."
                  : "Ajoutez une photo pour lancer l'identification."}
              </p>
            </div>

            {/* Decorative dots */}
            <div className="mt-4 flex justify-center gap-1.5 opacity-20" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full bg-workshop ${i === 5 || i === 6 ? "w-4" : "w-1"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A0A15] to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}








