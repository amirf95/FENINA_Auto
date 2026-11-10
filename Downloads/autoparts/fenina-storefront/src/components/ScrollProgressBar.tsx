import { useEffect, useState } from "react";

// A thin orientation aid, not a device: fixed chrome, always present, tells
// the visitor how far down the page they are without asking for attention.
export default function ScrollProgressBar() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setPct(total > 0 ? (h.scrollTop / total) * 100 : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed left-0 top-0 z-[60] h-[2px] w-full bg-transparent" aria-hidden="true">
      <div className="h-full bg-workshop" style={{ width: `${pct}%` }} />
    </div>
  );
}
