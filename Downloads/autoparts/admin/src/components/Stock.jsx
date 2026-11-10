import { AlertCircle, ArrowUpDown, Plus, Search } from "lucide-react";
import { fmt, DAY_LABELS } from "../lib/format.js";
import LoadMoreButton from "./LoadMoreButton.jsx";

const PART_SORTS = [
  { key: "name-asc",  label: "Nom A→Z",   title: "Ordre alphabétique" },
  { key: "name-desc", label: "Nom Z→A",   title: "Ordre alphabétique inverse" },
  { key: "qty-asc",   label: "Stock ↑",   title: "Stock le plus bas d'abord" },
  { key: "qty-desc",  label: "Stock ↓",   title: "Stock le plus élevé d'abord" },
  { key: "price-desc",label: "Prix ↓",    title: "Prix le plus élevé d'abord" },
];
const STOCK_FILTERS = [
  { key: "",    label: "Toutes" },
  { key: "low", label: "Stock faible" },
  { key: "out", label: "Rupture" },
];

function partStatus(part) {
  if (part.out_of_stock ?? part.quantity <= 0) return { label: "Rupture", cls: "st-unpaid" };
  if (part.low_stock ?? part.quantity <= part.reorder_level) return { label: "Stock faible", cls: "st-partial" };
  return { label: "OK", cls: "st-paid" };
}

export default function Stock({ parts, alerts, salesStats, query, setQuery, sort, setSort,
                 filter, setFilter, loading, onNew, onEdit, onDelete, onAdjust,
                 canDelete = true, hasMore, loadingMore, onLoadMore }) {
  const maxQty = Math.max(...(salesStats?.days || []).map((d) => d.quantity_sold), 1);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Inventaire</div>
          <h1>Stock <span className="page-count">{parts.length}</span></h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Plus size={16} /> Nouvelle pièce
        </button>
      </header>

      {(alerts.out_of_stock_count > 0 || alerts.low_stock_count > 0) && (
        <div className="stock-notice-strip">
          {alerts.out_of_stock_count > 0 && (
            <div className="stock-notice danger" onClick={() => setFilter("out")}>
              <AlertCircle size={16} />
              <div>
                <strong>{alerts.out_of_stock_count} en rupture</strong>
                <span className="muted">
                  {" "}{alerts.out_of_stock.slice(0, 3).map((p) => p.name).join(", ")}
                  {alerts.out_of_stock_count > 3 ? "…" : ""}
                </span>
              </div>
            </div>
          )}
          {alerts.low_stock_count > 0 && (
            <div className="stock-notice warn" onClick={() => setFilter("low")}>
              <AlertCircle size={16} />
              <div>
                <strong>{alerts.low_stock_count} bientôt épuisée{alerts.low_stock_count !== 1 ? "s" : ""}</strong>
                <span className="muted">
                  {" "}{alerts.low_stock.slice(0, 3).map((p) => p.name).join(", ")}
                  {alerts.low_stock_count > 3 ? "…" : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {salesStats && (
        <section className="panel db-trend-panel" style={{ marginBottom: 20 }}>
          <div className="panel-head" style={{ paddingBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              📦 Pièces vendues par jour — {salesStats.days.length} derniers jours
            </h2>
            <span className="muted" style={{ fontSize: 12 }}>
              Total: {salesStats.total_quantity} unités · {fmt(salesStats.total_revenue)}
            </span>
          </div>
          <div className="trend-chart">
            {salesStats.days.map((d, idx) => {
              const pct = maxQty > 0 ? (d.quantity_sold / maxQty) * 100 : 0;
              const isToday = idx === salesStats.days.length - 1;
              const day = new Date(d.date);
              return (
                <div key={d.date} className="trend-col">
                  <div className="trend-amount">{d.quantity_sold > 0 ? d.quantity_sold : ""}</div>
                  <div className="trend-bar-wrap">
                    <div
                      className={`trend-bar qty-bar${isToday ? " today" : ""}`}
                      style={{ "--bar-h": `${Math.max(pct, 2)}%`, animationDelay: `${idx * 40}ms` }}
                    />
                  </div>
                  <div className={`trend-day${isToday ? " today" : ""}`}>
                    {DAY_LABELS[day.getDay()]}
                    {isToday && <span className="trend-today-dot" />}
                  </div>
                </div>
              );
            })}
          </div>

          {salesStats.top_parts.length > 0 && (
            <div className="top-parts-row">
              <span className="fs-label" style={{ marginRight: 10 }}>Meilleures ventes</span>
              {salesStats.top_parts.map((p) => (
                <span key={p.part_id} className="top-part-chip">
                  {p.name} <strong>×{p.quantity}</strong>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Rechercher par nom, référence, marque…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="filter-strip">
        <div className="fs-group">
          <span className="fs-label">Trier</span>
          <div className="fs-chips">
            <ArrowUpDown size={13} className="sort-icon" />
            {PART_SORTS.map((s) => (
              <button key={s.key} title={s.title}
                className={`sort-chip${sort === s.key ? " on" : ""}`}
                onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="fs-sep" />
        <div className="fs-group">
          <span className="fs-label">Statut</span>
          <div className="fs-chips">
            {STOCK_FILTERS.map((f) => (
              <button key={f.key}
                className={`sort-chip${filter === f.key ? " on" : ""}`}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="empty" style={{ padding: "30px 0", textAlign: "center" }}>Chargement…</div>
        ) : parts.length === 0 ? (
          <div className="empty">Aucune pièce trouvée.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th><th>Désignation</th><th>Marque</th>
                <th className="r">Prix</th><th className="r">Stock</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const st = partStatus(part);
                return (
                  <tr key={part.id}>
                    <td className="mono">{part.sku}</td>
                    <td>{part.name}</td>
                    <td className="muted">{part.brand || "—"}</td>
                    <td className="r mono">{fmt(part.price)}</td>
                    <td className="r">
                      <div className="stock-qty-cell">
                        <button className="stock-adj-btn" title="Retirer / corriger" onClick={() => onAdjust(part, -1)}>−</button>
                        <span className="mono">{part.quantity}</span>
                        <button className="stock-adj-btn" title="Réapprovisionner" onClick={() => onAdjust(part, 1)}>+</button>
                      </div>
                    </td>
                    <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                    <td className="r">
                      <div className="stock-actions">
                        <button className="btn small update" onClick={() => onEdit(part)}>Modifier</button>
                        {canDelete && (
                          <button className="btn small delete" onClick={() => onDelete(part.id, part.name)}>Supprimer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={onLoadMore} />
    </div>
  );
}
