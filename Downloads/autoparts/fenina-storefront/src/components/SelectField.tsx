import { useEffect, useRef, useState } from "react";
import ChevronIcon from "./Icons/ChevronIcon";

/**
 * A dropdown field styled to match the finder card, used for "Marque",
 * "Modèle" and "Année" in the hero's vehicle finder.
 *
 * This is a custom-built listbox, not a native <select>. That's deliberate:
 * a native <select>'s open dropdown is drawn by the OS (Chrome/Edge on
 * Windows in particular), which ignores most CSS — including hover and
 * selected-item colors — so there was no way to make the list's hover state
 * match the workshop-gold brand with a real <select>. This version is real
 * markup we fully control, with the same keyboard support (open with Enter/
 * Space/Down, move with the arrow keys, pick with Enter, close with Escape
 * or a click outside) that a native select gives you for free.
 */
function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // `items[0]` is always the placeholder ("no selection"); `items[1..]` are
  // the real options. `selectedIndex` is index-into-`items`, not index-into-`options`.
  const items = [placeholder, ...options];
  const selectedIndex = value ? options.indexOf(value) + 1 : 0;

  // Derived, not synced via an effect: if the field becomes disabled while
  // its list happens to be open, the list simply stops rendering. No need to
  // separately force `open` back to false.
  const isOpen = open && !disabled;

  // Close when the visitor clicks anywhere outside this field. This is a
  // legitimate effect (subscribing to an external system, the document's
  // clicks) — it only calls setOpen from inside the event callback, not
  // synchronously in the effect body.
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isOpen]);

  const selectIndex = (index: number) => {
    onChange(index === 0 ? "" : options[index - 1]);
    setOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          onKeyDown={handleTriggerKeyDown}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-left font-body text-sm text-black outline-none transition-all focus-visible:ring-2 focus-visible:ring-workshop disabled:cursor-not-allowed disabled:opacity-35 ${
            isOpen ? "border-workshop/60" : "border-white/10 hover:border-workshop/40"
          }`}
        >
          {value || <span className="text-black/35">{placeholder}</span>}
        </button>

        <div className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronIcon />
        </div>

        {/* Mounted only while open, so its highlighted-row state below
            always starts fresh — no effect needed to "reset" it. */}
        {isOpen && (
          <OptionsList
            label={label}
            items={items}
            selectedIndex={selectedIndex}
            onSelect={selectIndex}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </label>
  );
}

/** The open dropdown panel itself — a separate component so its
 * highlighted-row state naturally resets every time it mounts (i.e. every
 * time the list opens), rather than needing an effect to sync it. */
function OptionsList({
  label,
  items,
  selectedIndex,
  onSelect,
  onClose,
}: {
  label: string;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const listRef = useRef<HTMLUListElement>(null);

  // Move keyboard focus into the list as soon as it appears. This runs once
  // per mount, which is exactly "the list just opened" — a plain DOM-focus
  // side effect, not a state-sync one.
  useEffect(() => {
    listRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect(highlightedIndex);
    }
  };

  return (
    <ul
      ref={listRef}
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={`${label}-option-${highlightedIndex}`}
      onKeyDown={handleKeyDown}
      className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#1A1A2E] py-1 shadow-xl shadow-black/40 outline-none"
    >
      {items.map((item, index) => (
        <li
          key={item || "placeholder"}
          id={`${label}-option-${index}`}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseEnter={() => setHighlightedIndex(index)}
          // mousedown (not click) fires before the trigger button's blur
          // would close the list, so the tap/click registers reliably.
          onMouseDown={(e) => { e.preventDefault(); onSelect(index); }}
          className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
            index === highlightedIndex ? "bg-workshop/15 text-workshop" : index === 0 ? "text-white/35" : "text-white/85"
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default SelectField;
