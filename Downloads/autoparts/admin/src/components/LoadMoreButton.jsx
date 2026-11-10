import { ChevronDown } from "lucide-react";

export default function LoadMoreButton({ hasMore, loading, onClick }) {
  if (!hasMore) return null;
  return (
    <div className="load-more-wrap">
      <button className="load-more-btn" onClick={onClick} disabled={loading}>
        <ChevronDown size={14} /> {loading ? "Chargement…" : "Charger plus"}
      </button>
    </div>
  );
}
