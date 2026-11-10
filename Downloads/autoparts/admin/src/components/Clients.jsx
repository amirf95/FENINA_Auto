import { useState } from "react";
import { Plus, Search, ArrowUpDown, X } from "lucide-react";
import { fmt, clientFullName, statusMeta } from "../lib/format.js";
import LoadMoreButton from "./LoadMoreButton.jsx";

const CLI_SORTS = [
  { key: "debt-desc",  label: "Dette ↓",    title: "Plus grande dette d'abord" },
  { key: "debt-asc",   label: "Dette ↑",    title: "Moins de dette d'abord" },
  { key: "name-asc",   label: "Nom A→Z",    title: "Ordre alphabétique" },
  { key: "name-desc",  label: "Nom Z→A",    title: "Ordre alphabétique inverse" },
  { key: "inv-desc",   label: "Factures ↓", title: "Plus de factures d'abord" },
];
const CLI_KINDS = [
  { key: "",           label: "Tous" },
  { key: "garage",     label: "Garage" },
  { key: "individual", label: "Particulier" },
];

export default function Clients({ clients, query, setQuery, sort, setSort, allInvoices, loading, onNew, onEdit, onDelete,
                    canDelete = true, hasMore, loadingMore, onLoadMore }) {
  const [kindFilter, setKindFilter] = useState("");
  const [clientInvModal, setClientInvModal] = useState(null);
  const [selectedInv, setSelectedInv] = useState(null);

  const invCountByClient = {};
  allInvoices.forEach((i) => { invCountByClient[i.client] = (invCountByClient[i.client] || 0) + 1; });

  const sorted = [...clients].sort((a, b) => {
    if (sort === "debt-desc") return Number(b.balance) - Number(a.balance);
    if (sort === "debt-asc")  return Number(a.balance) - Number(b.balance);
    if (sort === "name-desc") return clientFullName(b).localeCompare(clientFullName(a), "fr");
    if (sort === "inv-desc")  return (invCountByClient[b.id] || 0) - (invCountByClient[a.id] || 0);
    return clientFullName(a).localeCompare(clientFullName(b), "fr");
  });

  const displayed = kindFilter ? sorted.filter((c) => c.kind === kindFilter) : sorted;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Gestion</div>
          <h1>Clients <span className="page-count">
            {displayed.length}{kindFilter ? ` / ${clients.length}` : ""}
          </span></h1>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Plus size={16} /> Nouveau client
        </button>
      </header>

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            placeholder="Rechercher par nom, aka, téléphone, CIN, véhicule…"
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
            {CLI_SORTS.map((s) => (
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
          <span className="fs-label">Type</span>
          <div className="fs-chips">
            {CLI_KINDS.map((k) => (
              <button key={k.key}
                className={`sort-chip${kindFilter === k.key ? " on" : ""}`}
                onClick={() => setKindFilter(k.key)}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="empty" style={{ padding: "30px 0", textAlign: "center" }}>Chargement…</div>
        ) : displayed.length === 0 ? (
          <div className="empty">Aucun client trouvé.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th><th>Aka / Véhicule</th><th>Téléphone</th><th>Type</th>
                <th className="r">Factures</th><th className="r">Dette</th><th></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((client) => {
                const debt = Number(client.balance);
                const invCount = invCountByClient[client.id] || 0;
                return (
                  <tr key={client.id}>
                    <td>
                      {clientFullName(client)}
                      {debt > 0 && <span className="debt-badge">{fmt(debt)}</span>}
                    </td>
                    <td className="muted">{[client.aka, client.car].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{client.phone || <span className="muted">—</span>}</td>
                    <td>{client.kind_label}</td>
                    <td className="r">
                      {invCount > 0 ? (
                        <button className="inv-cnt-badge" onClick={() => { setClientInvModal(client); setSelectedInv(null); }}>
                          {invCount}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className={`r mono${debt > 0 ? " warn" : ""}`}>
                      {debt > 0 ? fmt(debt) : <span className="muted">—</span>}
                    </td>
                    <td className="r">
                      <button className="btn small ghost" onClick={() => onEdit(client)}>Modifier</button>
                      {canDelete && (
                        <button className="btn small delete" onClick={() => onDelete(client.id, clientFullName(client))}>Supprimer</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={onLoadMore} />

      {clientInvModal && (() => {
        const clientInvoices = allInvoices
          .filter((i) => i.client === clientInvModal.id)
          .sort((a, b) => b.issue_date.localeCompare(a.issue_date));
        const closeModal = () => { setClientInvModal(null); setSelectedInv(null); };
        return (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className={`modal cli-inv-modal${selectedInv ? " with-photo" : ""}`}
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Factures — {clientFullName(clientInvModal)}</h3>
                <button className="icon-btn" onClick={closeModal}><X size={18} /></button>
              </div>
              <div className="cli-inv-body">
                <div className="cli-inv-list">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>N°</th><th>Date</th>
                        <th className="r">Total</th><th className="r">Payé</th><th>Statut</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientInvoices.map((i) => (
                        <tr key={i.id}
                          className={`cli-inv-row${selectedInv?.id === i.id ? " selected" : ""}`}
                          onClick={() => setSelectedInv(selectedInv?.id === i.id ? null : i)}
                          title={i.photo ? "Voir la photo" : "Pas de photo disponible"}>
                          <td className="mono">
                            {i.number}
                            {i.is_existing && <span className="badge-existing">Existante</span>}
                          </td>
                          <td className="muted">{i.issue_date}</td>
                          <td className="r">{fmt(i.total)}</td>
                          <td className="r">{fmt(i.amount_paid)}</td>
                          <td><span className={`pill ${statusMeta[i.status].cls}`}>{statusMeta[i.status].label}</span></td>
                          <td style={{ width: 20 }}>
                            {i.photo && <span style={{ color: "var(--brand)", fontSize: 10 }}>📎</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedInv && (
                  <div className="cli-inv-photo">
                    <div className="cip-label">
                      Facture {selectedInv.number}
                      <button className="icon-btn" style={{ marginLeft: "auto" }}
                        onClick={() => setSelectedInv(null)}><X size={14} /></button>
                    </div>
                    {selectedInv.photo ? (
                      <div className="cip-img-wrap">
                        <img
                          src={selectedInv.photo}
                          alt={`Facture ${selectedInv.number}`}
                          className="cip-img"
                        />
                        <a
                          href={selectedInv.photo}
                          target="_blank"
                          rel="noreferrer"
                          className="btn small ghost"
                          style={{ marginTop: 10, display: "inline-block" }}>
                          Ouvrir en plein écran
                        </a>
                      </div>
                    ) : (
                      <div className="cip-empty">
                        <span style={{ fontSize: 32 }}>🖼️</span>
                        <p>Aucune photo<br />pour cette facture</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
