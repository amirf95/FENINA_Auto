import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll progress (0 to 1) through a tall wrapper element: 0 when its
 * top reaches the viewport top, 1 when its bottom reaches the viewport
 * bottom. Meant for a `position: sticky` stage nested inside the wrapper,
 * mirroring a pinned-act progress value.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) { setProgress(1); return; }
      const p = (0 - rect.top) / total;
      setProgress(Math.min(1, Math.max(0, p)));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
