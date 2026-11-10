import { Phone, Pencil, Printer, Upload, X } from "lucide-react";
import { fmt, statusMeta } from "../lib/format.js";
import { absUrl } from "../lib/api.js";

export default function InvoiceViewer({ inv, onClose, onEdit }) {
  const sm = statusMeta[inv.status] || statusMeta.unpaid;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal inv-view-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }} className="mono">{inv.number}</h3>
            <span className={`pill ${sm.cls}`}>{sm.label}</span>
            {inv.is_existing && <span className="badge-existing">Existante</span>}
            {inv.is_overdue && <span className="badge-overdue">En retard</span>}
          </div>
          <div className="no-print" style={{ display: "flex", gap: 4 }}>
            <button className="icon-btn" onClick={() => window.print()} title="Imprimer"><Printer size={17} /></button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body inv-view-body">
          <div className="print-letterhead">
            <strong>Fenina — Pièces auto</strong>
            <span className="muted">Facture imprimée le {new Date().toLocaleDateString("fr-TN")}</span>
          </div>

          {/* ── Client + dates ── */}
          <div className="inv-view-meta">
            <div className="inv-view-meta-cell">
              <div className="inv-meta-label">Client</div>
              <div className="inv-meta-val">{inv.client_name}</div>
              {inv.client_phone && (
                <div className="inv-meta-sub"><Phone size={12} /> {inv.client_phone}</div>
              )}
            </div>
            <div className="inv-view-meta-cell">
              <div className="inv-meta-label">Date d'émission</div>
              <div className="inv-meta-val">{inv.issue_date}</div>
            </div>
            <div className="inv-view-meta-cell">
              <div className="inv-meta-label">Échéance</div>
              <div className={`inv-meta-val${inv.is_overdue ? " danger" : ""}`}>{inv.due_date}</div>
              {inv.is_overdue && (
                <div className="inv-meta-sub danger">retard de {inv.days_overdue} j</div>
              )}
            </div>
          </div>

          {/* ── Lines (regular invoices) ── */}
          {!inv.is_existing && inv.lines && inv.lines.length > 0 && (
            <div className="inv-view-section">
              <div className="inv-section-title">Articles</div>
              <table className="table inv-lines-table">
                <thead>
                  <tr>
                    <th>Désignation</th>
                    <th className="r">Qté</th>
                    <th className="r">Prix unit.</th>
                    <th className="r">Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.description}</td>
                      <td className="r mono">{l.quantity}</td>
                      <td className="r mono">{fmt(l.unit_price)}</td>
                      <td className="r mono">{fmt(l.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Payments (regular invoices) ── */}
          {!inv.is_existing && inv.payments && inv.payments.length > 0 && (
            <div className="inv-view-section">
              <div className="inv-section-title">Paiements</div>
              <ul className="inv-payments-list">
                {inv.payments.map((p) => (
                  <li key={p.id}>
                    <span className="inv-pay-amount">{fmt(p.amount)}</span>
                    <span className="muted">— {p.method_label}</span>
                    <span className="muted">— {p.paid_on}</span>
                    {p.note && <span className="muted"> · {p.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Amounts summary (all invoices) ── */}
          <div className="inv-view-totals">
            <div className="inv-total-row">
              <span>Total</span>
              <strong className="mono">{fmt(inv.total)}</strong>
            </div>
            <div className="inv-total-row">
              <span>Montant payé</span>
              <strong className="mono">{fmt(inv.amount_paid)}</strong>
            </div>
            <div className="inv-total-row inv-total-due">
              <span>Reste à payer</span>
              <strong className={`mono${Number(inv.amount_due) > 0 ? " warn" : ""}`}>
                {fmt(inv.amount_due)}
              </strong>
            </div>
          </div>

          {/* ── Photo (existing invoices) ── */}
          {inv.is_existing && inv.photo && (
            <div className="inv-view-section">
              <div className="inv-section-title">Document joint</div>
              <a
                href={absUrl(inv.photo)}
                target="_blank"
                rel="noreferrer"
                className="inv-photo-link"
              >
                <Upload size={14} /> Voir le fichier
              </a>
            </div>
          )}

          {/* ── Notes ── */}
          {inv.notes && (
            <div className="inv-view-section">
              <div className="inv-section-title">Notes</div>
              <p className="inv-notes-text">{inv.notes}</p>
            </div>
          )}
        </div>

        <div className="modal-foot no-print">
          <button className="btn ghost" onClick={onClose}>Fermer</button>
          <button className="btn primary" onClick={onEdit}>
            <Pencil size={14} /> Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
