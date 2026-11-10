import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE } from "../lib/api";
import { showErrorToast } from "../lib/alerts";

const FAQ = [
  "Quelles marques ?",
  "Trouver ma pièce ?",
  "Livraison ?",
  "Horaires ?",
  "Garantie pièces ?",
  "Photo identification ?",
];

interface Msg {
  id: number;
  role: "user" | "assistant";
  content: string;
}

let _id = 0;

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 23) % 100,
  size: 1 + (i % 3),
  dur: 9 + (i % 7) * 1.4,
  del: (i % 6) * 1.1,
  dx: ((i % 5) - 2) * 16,
  dy: -14 - (i % 6) * 7,
}));

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{
    id: _id++,
    role: "assistant",
    content: "Bonjour ! Je suis l'assistant Fenina Auto Parts. 🔧\n\nComment puis-je vous assister auto aujourd'hui ?",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasNew, setHasNew] = useState(true);

  const msgsRef = useRef(msgs);
  const busyRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, [open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || busyRef.current) return;
    busyRef.current = true;
    const userMsg: Msg = { id: _id++, role: "user", content: text.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const history = [...msgsRef.current, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch(`${API_BASE}/chatbot/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const reply = data.reply ?? "Désolé, veuillez réessayer.";
      setMsgs(prev => [...prev, { id: _id++, role: "assistant", content: reply }]);
      if (!open) setHasNew(true);
    } catch {
      setMsgs(prev => [...prev, {
        id: _id++,
        role: "assistant",
        content: "Erreur de connexion. Contactez-nous directement sur WhatsApp pour une réponse rapide. 📱",
      }]);
      showErrorToast("Erreur de connexion à l'assistant.");
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, [open]);

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        className={`fixed bottom-24 left-5 z-50 w-[340px] sm:w-[380px] rounded-2xl overflow-hidden border border-workshop/20 shadow-[0_0_60px_rgba(245,197,24,0.15),0_30px_60px_rgba(0,0,0,0.75)] transition-all duration-500 ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-6 scale-95 pointer-events-none"
        }`}
        style={{ transformOrigin: "bottom left" }}
        aria-live="polite"
        role="dialog"
        aria-label="Assistant Fenina Auto Parts"
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-[#0A0A15]" aria-hidden="true">
          {/* Circuit grid */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(#F5C518 1px,transparent 1px),linear-gradient(90deg,#F5C518 1px,transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* 45° stripes */}
          <div
            className="absolute inset-0 opacity-[0.028]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,#F5C518 0 1px,transparent 1px 18px)",
            }}
          />
          {/* Top-left glow orb */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-workshop/14 blur-3xl animate-pulse-slow" />
          {/* Bottom-right glow orb */}
          <div
            className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-workshop/10 blur-3xl animate-float"
            style={{ animationDelay: "1.5s" }}
          />
          {/* Floating particles */}
          {PARTICLES.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full bg-workshop"
              style={
                {
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  opacity: 0.25,
                  animation: `chatParticle ${p.dur}s ease-in-out infinite ${p.del}s`,
                  "--cdx": `${p.dx}px`,
                  "--cdy": `${p.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
          {/* Hex accent top-right */}
          <div className="absolute top-3 right-4 opacity-[0.06]">
            <HexPattern />
          </div>
        </div>

        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-workshop/15 bg-[#0A0A15]/85 backdrop-blur-sm">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-workshop shrink-0 shadow-[0_0_18px_rgba(245,197,24,0.45)]">
            <BotIcon size={20} className="text-graphite" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#0A0A15]" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold uppercase tracking-wide text-workshop leading-tight">
              Assistant Fenina
            </p>
            <p className="font-mono text-[10px] text-workshop/50 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              En ligne · Auto Parts
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-cream/25 hover:text-workshop hover:bg-workshop/10 transition-all"
            aria-label="Fermer le chat"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="relative h-60 overflow-y-auto px-4 py-3 space-y-3 chat-scrollbar">
          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-workshop/15 border border-workshop/25 font-display text-[11px] font-bold text-workshop">
                  F
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 font-body text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-workshop text-graphite font-medium rounded-br-sm shadow-[0_0_20px_rgba(245,197,24,0.3)]"
                    : "bg-white/5 text-cream/85 border border-white/8 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex gap-2 justify-start">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-workshop/15 border border-workshop/25 font-display text-[11px] font-bold text-workshop">
                F
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
                <span className="flex gap-1 items-center h-4">
                  {[0, 160, 320].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 bg-workshop rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="!mt-0" />
        </div>

        {/* FAQ chips */}
        <div className="relative border-t border-workshop/10 px-4 pt-2 pb-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-workshop/40 mb-1.5">
            Questions fréquentes
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {FAQ.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={busy}
                className="rounded-full border border-workshop/22 bg-workshop/8 px-2.5 py-1 font-mono text-[10px] text-workshop/65 hover:bg-workshop/18 hover:border-workshop/50 hover:text-workshop transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input row */}
        <div className="relative border-t border-workshop/10 px-3 py-3 flex gap-2 bg-[#0A0A15]/60 backdrop-blur-sm">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Votre question..."
            disabled={busy}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-body text-sm text-cream placeholder-cream/20 outline-none focus:border-workshop/40 focus:bg-white/8 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-workshop text-graphite hover:bg-yellow-300 hover:shadow-[0_0_22px_rgba(245,197,24,0.5)] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Envoyer"
          >
            <SendIcon />
          </button>
        </div>

      </div>

      {/* ── Floating trigger button ── */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) setHasNew(false);
        }}
        className={`fixed bottom-5 left-5 z-50 h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
          open
            ? "bg-workshop shadow-[0_0_35px_rgba(245,197,24,0.7)] scale-105"
            : "bg-workshop shadow-[0_0_25px_rgba(245,197,24,0.45)] hover:scale-110 hover:shadow-[0_0_45px_rgba(245,197,24,0.7)]"
        }`}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        aria-expanded={open}
      >
        {/* Pulse rings */}
        {!open && (
          <>
            <span
              className="absolute inset-0 rounded-full border-2 border-workshop/50 animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
            <span
              className="absolute inset-0 rounded-full border border-workshop/25 animate-ping"
              style={{ animationDuration: "2.4s", animationDelay: "0.6s" }}
            />
          </>
        )}
        {/* Icon */}
        <div className={`transition-all duration-300 ${open ? "rotate-90 scale-90" : "scale-100"}`}>
          {open ? <XIcon size={22} className="text-graphite" /> : <BotIcon size={26} className="text-graphite" />}
        </div>
        {/* New message dot */}
        {hasNew && !open && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-mono text-[8px] font-bold text-white border-2 border-[#0A0A15] animate-bounce">
            1
          </span>
        )}
      </button>
    </>
  );
}

function BotIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <path d="M12 3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="2.5" r="1.2" fill="currentColor" />
      <path d="M8 20v2M16 20v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 8V7h6v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HexPattern() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {[
        [40, 16], [64, 29], [64, 51], [40, 64], [16, 51], [16, 29],
      ].map(([cx, cy], i) => (
        <polygon
          key={i}
          points={hexPoints(cx, cy, 11)}
          stroke="#F5C518"
          strokeWidth="1"
          fill="none"
        />
      ))}
      <polygon points={hexPoints(40, 40, 11)} stroke="#F5C518" strokeWidth="1" fill="none" />
    </svg>
  );
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}
