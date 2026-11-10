import { useLayoutEffect, useRef, useState } from "react";
import { useScrollProgress, usePrefersReducedMotion } from "../hooks/useScrollProgress";

/**
 * CarBlueprint — the storefront's scroll-driven "signature move".
 *
 * The big idea: a technical line-drawing of a car sits pinned in the middle
 * of the screen while the visitor scrolls. As they scroll, the outline draws
 * itself in (via an SVG stroke that "unwinds"), then each of the 8 real part
 * categories from the shop's catalogue lights up on the car in turn, in sync
 * with a small legend below it.
 *
 * How the scroll-to-animation mapping works:
 *   1. `useScrollProgress` turns "how far the visitor has scrolled through
 *      this section" into a single number `progress`, from 0 (top of the
 *      section) to 1 (bottom of the section).
 *   2. Each part in `PARTS` owns a "reveal window" — a [start, end] slice of
 *      that 0..1 range, e.g. [0.05, 0.20] for the engine. `getLocalProgress`
 *      converts the *global* `progress` into that part's *own* 0..1 progress,
 *      so "Moteur" doesn't care what the overall scroll position is, only
 *      "how far along am I, within my own window".
 *   3. That local 0..1 value drives opacity fades and, for the more detailed
 *      shapes, an actual "line drawing itself" effect (see `useSelfDrawingPath`
 *      below).
 *
 * The reveal windows deliberately overlap a little (e.g. Moteur ends at 0.20
 * while Refroidissement starts at 0.18): the outgoing part is still settling
 * while the next one begins, so the animation never has an empty, dead beat
 * in between two parts.
 */

// ─────────────────────────────────────────────────────────────
// Data: the 8 real part categories, and where/when each appears
// ─────────────────────────────────────────────────────────────

type ScrollWindow = [start: number, end: number];

type CarPart = {
  /** Stable identifier used to look this part up — never used for display. */
  key: string;
  /** Short code shown in the legend (matches the shop's category codes). */
  code: string;
  /** Full French label shown in the legend. */
  label: string;
  /** The [start, end] slice of overall scroll progress where this part is "active". */
  revealWindow: ScrollWindow;
  /** Where on the 900x340 SVG canvas this part's highlight marker sits. */
  markerAt: { x: number; y: number };
  /** A few real-catalogue examples, shown in the example card once this part is active. */
  examples: string[];
};

// Ordered by when they appear on scroll — this is display order, not
// front-to-back position on the actual car. the yellow central dots
const PARTS: CarPart[] = [
  { key: "moteur", code: "MTR", label: "Moteur & Transmission",           revealWindow: [0.2, 0.25], markerAt: { x: 680, y: 180 },
    examples: ["Courroie de distribution", "Kit d'embrayage", "Joint de culasse"] },
  { key: "hvac",   code: "RFR", label: "Refroidissement & Climatisation", revealWindow: [0.25, 0.35], markerAt: { x: 806, y: 250 },
    examples: ["Radiateur moteur", "Compresseur de climatisation", "Durite de refroidissement"] },
  { key: "ecl",    code: "ECL", label: "Éclairage",                       revealWindow: [0.32, 0.44], markerAt: { x: 808, y: 216 },
    examples: ["Ampoule H7", "Feu arrière LED", "Optique de phare"] },
  { key: "elc",    code: "ELC", label: "Électricité & Électronique",      revealWindow: [0.42, 0.55], markerAt: { x: 750, y: 200 },
    examples: ["Batterie Nour 70Ah", "Alternateur", "Démarreur"] },
  { key: "flt",    code: "FLT", label: "Filtres & Entretien",             revealWindow: [0.53, 0.65], markerAt: { x: 328, y: 200   },
    examples: ["Filtre à huile", "Filtre à air", "Filtre d'habitacle"] },
  { key: "frn",    code: "FRN", label: "Freinage",                        revealWindow: [0.63, 0.75], markerAt: { x: 650, y: 300 },
    examples: ["Plaquettes Bosch", "Disque de frein", "Étrier de frein"] },
  { key: "sus",    code: "SUS", label: "Suspension & Direction",          revealWindow: [0.73, 0.85], markerAt: { x: 172, y: 202 },
    examples: ["Amortisseur", "Rotule de direction", "Ressort de suspension"] },
  { key: "car",    code: "CAR", label: "Carrosserie & Vitrage",           revealWindow: [0.83, 1.00], markerAt: { x: 80, y: 220 },
    examples: ["Pare-brise", "Rétroviseur électrique", "Pare-choc avant"] },
];

// Looking parts up by `.key` (instead of by array position like `PARTS[3]`)
// 
// is the whole point of this map: the render code below can say exactly
// which category it means, so reordering or adding entries to PARTS above
// can never silently point some other part's animation at the wrong window.
const PARTS_BY_KEY: Record<string, CarPart> = Object.fromEntries(
  PARTS.map((part) => [part.key, part])
);

// The car's outline, as one closed SVG path. Hand-drawn, not traced from a
// photo — a Porsche-911-flavoured silhouette (one unbroken fastback curve
// from the rear haunch over a forward-set roof to a low, rounded nose, with
// real arch cutouts over both wheels) rather than a boxy sedan profile, but
// still meant to read as a technical blueprint, not a realistic car.
const CAR_OUTLINE_PATH =
  // Rear haunch, up over the fastback roofline, down the hood to the nose.
  "M65,300 L65,268 Q58,232 88,218 Q130,200 165,188 Q190,178 210,155 " +
  "Q230,120 275,100 Q330,86 400,84 Q460,83 505,90 Q545,98 570,113 " +
  "Q595,130 608,150 Q650,148 690,158 Q730,168 760,185 Q790,200 805,205 " +
  "Q822,225 825,260 L825,300 " +
  // Underbody, back toward the tail, arching up over each wheel in turn.
  "L708,300 Q708,228 650,228 Q592,228 592,300 " +
  "L248,300 Q248,228 190,228 Q132,228 132,300 L65,300 Z";

// The drawing itself (outline + all 8 parts) only ever plays out across the
// first 82% of the section's scroll — the remaining 18% is reserved for the
// car driving off to the right once it's fully drawn (see `exitProgress`
// below). `.blueprint-track`'s height in index.css is sized off this same
// constant so the drawing keeps its original pace either way.
const REVEAL_END = 0.82;

// How far (in the SVG's own 900-wide viewBox units) the car group travels
// during the exit — comfortably more than the viewBox width so every part of
// the car clears the right edge, not just its rightmost point.
const EXIT_TRANSLATE_X = 900;

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────

/** Clamp a number to the 0..1 range. */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Converts overall scroll `progress` (0..1 across the *whole* car diagram)
 * into a part's *own* 0..1 progress within its `revealWindow`.
 * Returns 0 before the window starts, 1 after it ends.
 */
function getLocalProgress(progress: number, revealWindow: ScrollWindow, reducedMotion: boolean): number {
  if (reducedMotion) return 1; // reduced motion: everything is just "done"
  const [start, end] = revealWindow;
  return clamp01((progress - start) / (end - start));
}

/**
 * Makes an SVG shape "draw itself" as `localProgress` goes from 0 to 1,
 * using the classic stroke-dasharray/stroke-dashoffset trick: the shape's
 * whole outline is set as one dash exactly as long as the path itself, then
 * that dash is slid out from behind an offset so it looks like the line is
 * being drawn rather than just fading in.
 *
 * Takes the *caller's own* ref (created with a plain `useRef` at the call
 * site, and attached directly as `ref={theRef}`) rather than creating and
 * returning one of its own — that keeps "the ref" and "the derived style"
 * as two separate, independent values instead of bundling them into one
 * object, which is what React's rules-of-hooks linter wants here.
 *
 * The path's real length in pixels can only be known once it's actually
 * rendered (`getTotalLength()`), which is why this measures it in a
 * `useLayoutEffect` after mount rather than computing it from the `d`
 * attribute up front.
 */
function useSelfDrawingStyle<T extends SVGGeometryElement>(
  ref: React.RefObject<T | null>,
  localProgress: number
): React.CSSProperties | undefined {
  const [pathLength, setPathLength] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) setPathLength(ref.current.getTotalLength());
  }, [ref]);

  if (!pathLength) return undefined;
  return { strokeDasharray: pathLength, strokeDashoffset: pathLength * (1 - localProgress) };
}

// ─────────────────────────────────────────────────────────────
// The component
// ─────────────────────────────────────────────────────────────

export default function CarBlueprint() {
  const { ref: scrollTrackRef, progress } = useScrollProgress<HTMLDivElement>();
  const reducedMotion = usePrefersReducedMotion();

  // Everything the drawing itself does (outline + all 8 parts) is driven by
  // `revealProgress`, not raw `progress` — it's `progress` rescaled so the
  // whole drawing still finishes exactly like before, just compressed into
  // the first REVEAL_END share of the section's scroll. The remainder drives
  // `exitProgress`, which stays 0 until the drawing is done and then ramps
  // to 1 as the car slides off to the right.
  const revealProgress = reducedMotion ? 1 : clamp01(progress / REVEAL_END);
  const exitProgress = reducedMotion ? 0 : clamp01((progress - REVEAL_END) / (1 - REVEAL_END));

  // Whichever single part currently "owns" the scroll position (its window
  // has started, the next one's hasn't yet) — the same rule the legend and
  // the example card below both key off of, so they're never out of sync.
  // Doesn't apply in reduced motion: there everything is already drawn at
  // once, so there's no single "current" part to spotlight.
  const activePartIndex = reducedMotion
    ? -1
    : PARTS.findIndex((part, index) => {
        const nextWindowStart = PARTS[index + 1]?.revealWindow[0] ?? Infinity;
        return revealProgress >= part.revealWindow[0] && revealProgress < nextWindowStart;
      });
  const activePart = activePartIndex >= 0 ? PARTS[activePartIndex] : null;

  // The outline draws in over the first 22% of the reveal, independently of
  // any single part's window — it's the "establishing shot" the rest builds on.
  const outlineProgress = reducedMotion ? 1 : clamp01(revealProgress / 0.22);
  const moteurProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.moteur.revealWindow, reducedMotion);
  const hvacProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.hvac.revealWindow, reducedMotion);
  const eclProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.ecl.revealWindow, reducedMotion);
  const elcProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.elc.revealWindow, reducedMotion);
  const fltProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.flt.revealWindow, reducedMotion);
  const frnProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.frn.revealWindow, reducedMotion);
  const susProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.sus.revealWindow, reducedMotion);
  const carTrimProgress = getLocalProgress(revealProgress, PARTS_BY_KEY.car.revealWindow, reducedMotion);

  // Each shape that actually "draws itself" owns a plain ref (attached
  // directly below as `ref={...}`) plus a derived style from that ref.
  // The simpler fade-only shapes (HVAC grille, battery, filter, wheel rims)
  // don't need this — a plain opacity is enough for those.
  const outlineRef = useRef<SVGPathElement>(null);
  const moteurRef = useRef<SVGRectElement>(null);
  const eclRef = useRef<SVGEllipseElement>(null);
  const frnRef = useRef<SVGCircleElement>(null);
  const susRef = useRef<SVGPathElement>(null);
  const carTrimRef = useRef<SVGPathElement>(null);

  const outlineStyle = useSelfDrawingStyle(outlineRef, outlineProgress);
  const moteurStyle = useSelfDrawingStyle(moteurRef, moteurProgress);
  const eclStyle = useSelfDrawingStyle(eclRef, eclProgress);
  const frnStyle = useSelfDrawingStyle(frnRef, frnProgress);
  const susStyle = useSelfDrawingStyle(susRef, susProgress);
  const carTrimStyle = useSelfDrawingStyle(carTrimRef, carTrimProgress);

  const diagram = (
    <div className="blueprint-content">
      <p className="blueprint-eyebrow">Ce qu'il y a dans votre voiture</p>

      <svg className="blueprint-diagram" viewBox="0 0 900 340" fill="none" aria-hidden="true">
        {/* Faint background grid, matching the hero section's blueprint texture */}
        <defs>
          <pattern id="blueprint-grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="#F5C518" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
          {/* Headlight glow + beam, used by the Éclairage group below. Warmer
              and brighter than the rest of the blueprint's gold-on-navy line
              art on purpose — this is meant to read as an actual light
              source, not another outline. */}
          <radialGradient id="headlight-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#F5C518" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F5C518" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="headlight-beam" x1="806" y1="216" x2="892" y2="216" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#F5C518" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="900" height="340" fill="url(#blueprint-grid-pattern)" />
        <line x1="40" y1="300" x2="860" y2="300" stroke="#F5C518" strokeOpacity="0.18" strokeWidth="1" />

        {/* ── The car itself: outline, wheels, all 8 parts, and their
            markers — grouped together so the exit phase can slide the whole
            vehicle off to the right as one unit, while the grid/baseline
            backdrop above stays put. ── */}
        <g transform={`translate(${exitProgress * EXIT_TRANSLATE_X} 0)`}>
          {/* ── The car's outline, drawing itself in first ── */}
          <path
            ref={outlineRef}
            d={CAR_OUTLINE_PATH}
            stroke="#F5C518"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={outlineStyle}
          />

          {/* Wheels appear early too (fixed fade, not tied to any one part's
              window) — a car needs to look grounded before anything else shows. */}
          <g opacity={reducedMotion ? 1 : clamp01((revealProgress - 0.02) / 0.1)}>
            <circle cx="190" cy="300" r="46" stroke="#F5C518" strokeOpacity="0.5" strokeWidth="2" />
            <circle cx="650" cy="300" r="46" stroke="#F5C518" strokeOpacity="0.5" strokeWidth="2" />
          </g>

         {/* ── Moteur & Transmission: hatched block under the hood ── */}
<g opacity={Math.min(1, moteurProgress * 2.2)}>
  <rect
    ref={moteurRef}
    x="630"
    y="170"
    width="90"
    height="45"
    rx="5"
    stroke="#F5C518"
    strokeWidth="2"
    style={moteurStyle}
  />

  <path
    d="
      M640,180 L710,180
      M640,192 L710,192
      M640,204 L710,204
    "
    stroke="#F5C518"
    strokeWidth="1.5"
    opacity={moteurProgress}
  />
</g>
          {/* ── Refroidissement & Climatisation: grille lines at the nose ── */}
          <g opacity={hvacProgress}>
            <path d="M798,235 V290 M804,235 V290 M810,235 V290 M816,235 V290" stroke="#F5C518" strokeWidth="2" />
          </g>

          {/* ── Éclairage: headlight, with a glow + beam shining out past the nose ──
              The beam fades in with the same `eclProgress` as the bulb outline
              itself, so light only appears once the headlight has actually
              finished drawing in — not before. */}
          <g opacity={Math.min(1, eclProgress * 1.8)}>
            <circle cx="806" cy="216" r="24" fill="url(#headlight-glow)" />
            <path d="M808,216 L892,198 L892,234 Z" fill="url(#headlight-beam)" />
            <path d="M808,216 L888,204 M808,216 L888,228" stroke="#FFE066" strokeWidth="1" strokeOpacity="0.55" strokeDasharray="1 4" strokeLinecap="round" />
          </g>
          <ellipse ref={eclRef}
            cx="806" cy="216" rx="10" ry="14" stroke="#F5C518" strokeWidth="2" style={eclStyle} />

          {/* ── Électricité & Électronique: battery + bolt icon ── */}
          <g opacity={elcProgress}>
            <rect x="730" y="200" width="40" height="35" rx="2" stroke="#F5C518" strokeWidth="2" />
          </g>

          {/* ── Oil pressure warning ── */}
<g
  transform="translate(300 200) scale(0.16)"
  opacity={fltProgress}
>
  <path
    d="
      M475,35
      L467,25
      L448,24
      L303,98
      L278,78
      L261,61
      L253,59
      L219,61
      L222,26
      L220,22
      L213,18
      L143,23
      L134,34
      L129,63
      L70,65
      L32,44
      L22,44
      L14,52
      L1,107
      L1,120
      L40,152
      L24,217
      L25,229
      L34,236
      L278,257
      L291,254
      L304,240
      L478,81
      Z

      M432,72
      L274,219
      L53,204
      L57,193
      L78,92
      L242,90
      L288,133
      L302,134

      M34,83
      L50,92
      L44,121
      L28,109

      M160,74
      L163,62
      L190,61
      L192,74
    "
    stroke="#F5C518"
    strokeWidth="8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />

  <path
    d="
      M470,124
      C458,138 451,151 451,164
      C451,180 457,190 468,194
      C482,198 492,190 496,179
      C500,166 497,151 491,139
      C485,128 478,120 470,124
      Z
    "
    stroke="#F5C518"
    strokeWidth="8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</g>
          {/* ── Freinage: a drilled brake rotor with its caliper clamped over
              the edge, inside the front wheel ── */}
          <circle ref={frnRef}
            cx="650" cy="300" r="19" stroke="#F5C518" strokeWidth="2" style={frnStyle} />
          <g opacity={frnProgress}>
            <circle cx="663" cy="300" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <circle cx="657" cy="289" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <circle cx="643" cy="289" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <circle cx="637" cy="300" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <circle cx="643" cy="311" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <circle cx="657" cy="311" r="2" stroke="#F5C518" strokeWidth="1.2" />
            <rect x="658" y="279" width="16" height="20" rx="3" stroke="#F5C518" strokeWidth="2" />
          </g>

          {/* ── Suspension & Direction ── */}
<path
  ref={susRef}
  d="
    M172,182
    C165,182 162,185 162,188
    C162,191 165,193 172,194
    C179,195 182,197 182,200
    C182,203 179,205 172,206
    C165,207 162,209 162,212
    C162,215 165,217 172,218
    C179,219 182,221 182,224
    C182,227 179,229 172,229
  "
  stroke="#F5C518"
  strokeWidth="2"
  strokeLinecap="round"
  fill="none"
  style={susStyle}
/>

<g opacity={susProgress}>
  <path
    d="M158,182 H186"
    stroke="#F5C518"
    strokeWidth="2"
    strokeLinecap="round"
  />

  <path
    d="M158,229 H186"
    stroke="#F5C518"
    strokeWidth="2"
    strokeLinecap="round"
  />
</g>

        

          {/* ── Active-part markers ──
              A small pulsing dot on the shape itself, for each part that's
              currently active. The actual text labels live in the HTML legend
              below (not here) so they render at a fixed, readable size no
              matter how small this SVG scales down on a narrow phone screen. */}
          {PARTS.map((part) => {
            const localProgress = getLocalProgress(revealProgress, part.revealWindow, reducedMotion);
            if (localProgress <= 0 && !reducedMotion) return null;
            return (
              <circle key={part.key} cx={part.markerAt.x} cy={part.markerAt.y} r="4"
                fill="#F5C518" opacity={clamp01(localProgress * 3)} />
            );
          })}
        </g>
      </svg>

      {/* ── Example card: once a part finishes drawing and becomes the
          active one, this shows a few real examples from that category —
          same `activePart` the legend below highlights, so the two are
          always in sync. Always mounted (with a reserved min-height in CSS)
          so fading it in/out never shifts the legend below it; fades out
          again as the car drives off at the very end. */}
      <div className="blueprint-example-card" style={{ opacity: activePart ? 1 - exitProgress : 0 }}>
        {activePart && (
          <>
            <div className="blueprint-example-header">
              <span className="blueprint-example-code">{activePart.code}</span>
              <span className="blueprint-example-label">{activePart.label}</span>
            </div>
            <ul className="blueprint-example-list">
              {activePart.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── Legend: real HTML text, one pill per category ──
          Highlights whichever single part currently "owns" the scroll
          position — `activePartIndex` above, computed once and shared with
          the example card so the two never disagree. Reduced motion has no
          single "current" part (everything's already drawn), so it falls
          back to "has this part's window started at all". */}
      <div className="blueprint-legend">
        {PARTS.map((part, index) => {
          const localProgress = getLocalProgress(revealProgress, part.revealWindow, reducedMotion);
          const isActive = reducedMotion ? localProgress > 0.15 : index === activePartIndex;
          return (
            <div key={part.key} className={`blueprint-legend-item${isActive ? " is-active" : ""}`}>
              <span className="blueprint-legend-code">{part.code}</span>
              <span className="blueprint-legend-label">{part.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Reduced motion: skip the tall scroll-driven wrapper entirely and just
  // show the finished diagram as a normal, static block of content.
  if (reducedMotion) {
    return <div className="blueprint-track blueprint-track--static">{diagram}</div>;
  }

  return (
    <div className="blueprint-track" ref={scrollTrackRef}>
      <div className="blueprint-pinned-stage">{diagram}</div>
    </div>
  );
}
