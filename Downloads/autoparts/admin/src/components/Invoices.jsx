import { useState } from "react";
import { Plus, Search, ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import { fmt, statusMeta } from "../lib/format.js";
import LoadMoreButton from "./LoadMoreButton.jsx";

const INV_SORTS = [
  { key: "date-desc",   label: "Date ↓",    title: "Plus récente d'abord" },
  { key: "date-asc",    label: "Date ↑",    title: "Plus ancienne d'abord" },
  { key: "amount-desc", label: "Montant ↓", title: "Montant le plus élevé" },
  { key: "amount-asc",  label: "Montant ↑", title: "Montant le plus bas" },
];
const INV_STATUS = [
  { key: "",        label: "Tous" },
  { key: "paid",    label: "Payées" },
  { key: "partial", label: "Partielles" },
  { key: "unpaid",  label: "Non payées" },
  { key: "overdue", label: "En retard" },
];

export default function Invoices({ invoices, query, setQuery, sort, setSort, loading, onNew, onView, onEdit, onDelete,
                     canDelete = true, hasMore, loadingMore, onLoadMore }) {
  const [confirm, setConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = invoices.filter((i) => {
    if (!statusFilter) return true;
    if (statusFilter === "overdue") return i.is_overdue;
    return i.status === statusFilter;
  });

  const displayed = sort.startsWith("amount")
    ? [...filtered].sort((a, b) =>
        sort === "amount-desc"
          ? Number(b.total) - Number(a.total)
          : Number(a.total) - Number(b.total)
      )
    : filtered;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Gestion</div>
          <h1>Factures <span className="page-count">
            {displayed.length}{statusFilter ? ` / ${invoices.length}` : ""}
          </span></h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Plus size={16} /> Nouvelle facture
        </button>
      </header>

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Rechercher par numéro, client, téléphone, aka…"
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
            {INV_SORTS.map((s) => (
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
            {INV_STATUS.map((s) => (
              <button key={s.key}
                className={`sort-chip${statusFilter === s.key ? " on" : ""}`}
                onClick={() => setStatusFilter(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="empty" style={{ padding: "30px 0", textAlign: "center" }}>Chargement…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N°</th><th>Client</th><th>Date</th><th>Échéance</th>
                <th className="r">Total</th><th className="r">Payé</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="empty-row">Aucune facture trouvée.</td></tr>
              )}
              {displayed.map((i) => (
                <tr key={i.id}>
                  <td className="mono">
                    {i.number}
                    {i.is_existing && <span className="badge-existing">Existante</span>}
                  </td>
                  <td>{i.client_name}</td>
                  <td className="muted">{i.issue_date}</td>
                  <td className="muted">{i.due_date}</td>
                  <td className="r">{fmt(i.total)}</td>
                  <td className="r">{fmt(i.amount_paid)}</td>
                  <td><span className={`pill ${statusMeta[i.status].cls}`}>{statusMeta[i.status].label}</span></td>
                  <td className="actions">
                    <button className="icon-btn" onClick={() => onView(i)} title="Voir"><Eye size={15} /></button>
                    <button className="icon-btn" onClick={() => onEdit(i)} title="Modifier"><Pencil size={15} /></button>
                    {canDelete && (
                      <button className="icon-btn delete" onClick={() => setConfirm(i)} title="Supprimer"><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={onLoadMore} />

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <h3>Supprimer la facture {confirm.number} ?</h3>
            <p className="muted">
              Cette action est définitive. La facture de {confirm.client_name} ({fmt(confirm.total)}) sera supprimée.
            </p>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn delete" onClick={() => { onDelete(confirm.id, confirm.number); setConfirm(null); }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
