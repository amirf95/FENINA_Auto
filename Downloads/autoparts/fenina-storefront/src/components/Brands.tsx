import { useRef } from "react";
import { useInView } from "../hooks/useInView";

type Brand = { name: string; color: string; bg: string };

const BRANDS: Brand[] = [
  { name: "Valeo",       color: "#0033A0", bg: "#EEF2FF" },
  { name: "Bosch",       color: "#CC0000", bg: "#FFF0F0" },
  { name: "LUK",         color: "#8B0000", bg: "#FFF5F5" },
  { name: "SKF",         color: "#003399", bg: "#EEF3FF" },
  { name: "NGK",         color: "#00539B", bg: "#EEF6FF" },
  { name: "MANN",        color: "#B30000", bg: "#FFF0F0" },
  { name: "Hella",       color: "#D4940A", bg: "#FFFBEB" },
  { name: "Brembo",      color: "#CC0000", bg: "#FFF5F5" },
  { name: "Gates",       color: "#003DA6", bg: "#EEF2FF" },
  { name: "Dayco",       color: "#1F3A6E", bg: "#EEF2FF" },
  { name: "Castrol",     color: "#007A33", bg: "#F0FFF4" },
  { name: "Total",       color: "#C65A00", bg: "#FFF7ED" },
  { name: "Motul",       color: "#C0001A", bg: "#FFF0F2" },
  { name: "KYB",         color: "#003087", bg: "#EEF2FF" },
  { name: "Nour",        color: "#B45309", bg: "#FFFBEB" },
  { name: "Ferodo",      color: "#D45B00", bg: "#FFF7ED" },
];

// Duplicate for seamless loop
const ROW1 = [...BRANDS, ...BRANDS];
const ROW2 = [...BRANDS.slice(8), ...BRANDS.slice(0, 8), ...BRANDS.slice(8), ...BRANDS.slice(0, 8)];

export default function Brands() {
  const { ref, inView } = useInView();

  return (
    <section id="brands" className="overflow-hidden bg-white">
      {/* Section header */}
      <div className="mx-auto max-w-7xl px-5 pt-20 pb-12 lg:px-8">
        <div
          ref={ref}
          className="text-center"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-steel">Nos partenaires</p>
          <h2 className="mt-2 font-display text-3xl font-semibold uppercase tracking-tight text-graphite sm:text-4xl">
            Marques disponibles
          </h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-workshop" />
          <p className="mx-auto mt-5 max-w-lg font-body text-sm leading-relaxed text-steel">
            Nous stockons les meilleures marques mondiales pour garantir qualité et fiabilité sur chaque réparation.
          </p>
        </div>
      </div>

      {/* Marquee row 1 – scrolls left */}
      <div className="marquee-row relative mb-4 overflow-hidden">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />

        <div
          className="flex gap-4 animate-scroll-left"
          style={{ width: "max-content", willChange: "transform" }}
        >
          {ROW1.map((brand, i) => (
            <BrandCard key={`r1-${i}`} brand={brand} />
          ))}
        </div>
      </div>

      {/* Marquee row 2 – scrolls right */}
      <div className="marquee-row relative overflow-hidden pb-20">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />

        <div
          className="flex gap-4 animate-scroll-right"
          style={{ width: "max-content", willChange: "transform" }}
        >
          {ROW2.map((brand, i) => (
            <BrandCard key={`r2-${i}`} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandCard({ brand }: { brand: Brand }) {
  const ref = useRef<HTMLDivElement>(null);

  // Pointer tilt, desktop-hover only. Interpolated toward the pointer rather
  // than snapped to it, and reset on leave via the CSS transition.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(500px) rotateX(${py * -8}deg) rotateY(${px * 8}deg) scale(1.05)`;
  };
  const onPointerLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group flex h-16 w-44 shrink-0 cursor-default select-none items-center justify-center rounded-2xl border border-gray-100 px-6 shadow-none transition-[transform,box-shadow] duration-200 ease-out hover:shadow-lg motion-reduce:hover:scale-100"
      style={{ backgroundColor: brand.bg, willChange: "transform" }}
    >
      <span
        className="font-display text-xl font-semibold tracking-tight"
        style={{ color: brand.color }}
      >
        {brand.name}
      </span>
    </div>
  );
}
