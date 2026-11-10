import { useState } from "react";
import { Upload, X } from "lucide-react";
import { fmt, clientFullName, statusMeta } from "../lib/format.js";
import { absUrl } from "../lib/api.js";

export default function ExistingInvoiceEditor({ base, clients, onClose, onSave, onSavePatch, onCreateClient }) {
  const isEdit = !!base;
  const today = new Date().toISOString().slice(0, 10);

  const [number, setNumber] = useState(base?.number || "");
  const [clientSearch, setClientSearch] = useState(base?.client_name || "");
  const [selectedClient, setSelectedClient] = useState(
    base ? { id: base.client, name: base.client_name, phone: base.client_phone } : null
  );
  const [showDrop, setShowDrop] = useState(false);
  const [manualTotal, setManualTotal] = useState(base?.manual_total ?? "");
  const [manualPaid, setManualPaid] = useState(base?.manual_paid ?? "");
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState(base?.notes || "");
  const [issueDate, setIssueDate] = useState(base?.issue_date || today);

  const remaining = Math.max(0, (Number(manualTotal) || 0) - (Number(manualPaid) || 0));
  const total = Number(manualTotal) || 0;
  const paid  = Number(manualPaid)  || 0;
  const status = total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

  const _q = clientSearch.toLowerCase();
  const filteredClients = clients.filter((c) =>
    clientFullName(c).toLowerCase().includes(_q) ||
    (c.phone || "").includes(clientSearch) ||
    (c.car || c.Car || "").toLowerCase().includes(_q) ||
    (c.cin || c.CIN || "").toLowerCase().includes(_q) ||
    (c.aka || c.Aka || c.AKA || "").toLowerCase().includes(_q)
  );

  const canSave = (isEdit || number.trim()) && selectedClient && manualTotal !== "";

  const submit = () => {
    if (!canSave) return;
    const fd = new FormData();
    fd.append("number", number.trim());
    fd.append("client", selectedClient.id);
    fd.append("manual_total", String(manualTotal));
    fd.append("manual_paid",  String(manualPaid || 0));
    fd.append("notes", notes.trim());
    fd.append("issue_date", issueDate);
    if (photo) fd.append("photo", photo);
    if (isEdit) {
      onSavePatch(base.id, fd);
    } else {
      onSave(fd);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? `Modifier ${base.number}` : "Enregistrer une facture existante"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label className="field">
              <span className={isEdit ? "" : "req"}>Numéro de facture</span>
              <input
                value={number}
                onChange={(e) => !isEdit && setNumber(e.target.value)}
                placeholder="Ex: F-2024-001"
                readOnly={isEdit}
                style={isEdit ? { opacity: 0.6 } : {}}
                autoFocus={!isEdit}
              />
            </label>
            <label className="field">
              <span>Date d'émission</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
          </div>

          {/* Client search */}
          <div className="field" style={{ position: "relative", marginBottom: 14 }}>
            <span className="req">Client</span>
            <input
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              placeholder="Rechercher un client…"
            />
            {showDrop && clientSearch && (
              <div className="client-drop">
                {filteredClients.length === 0 ? (
                  <div className="drop-empty">Aucun client trouvé</div>
                ) : filteredClients.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="drop-item"
                    onMouseDown={() => { setSelectedClient(c); setClientSearch(clientFullName(c)); setShowDrop(false); }}
                  >
                    <strong>{clientFullName(c)}</strong>
                    {c.phone && <span className="muted"> · {c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="field-row">
            <label className="field">
              <span className="req">Montant total (DT)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder="0.000"
              />
            </label>
            <label className="field">
              <span>Montant payé (DT)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={manualPaid}
                onChange={(e) => setManualPaid(e.target.value)}
                placeholder="0.000"
              />
            </label>
          </div>

          <div className="remain-box">
            <div className="remain-row">
              <span>Reste à payer</span>
              <strong className={remaining > 0 ? "warn" : ""}>{fmt(remaining)}</strong>
            </div>
            <div className="remain-row">
              <span>Statut</span>
              <span className={`pill ${statusMeta[status].cls}`}>{statusMeta[status].label}</span>
            </div>
          </div>

          <label className="field" style={{ marginTop: 14, marginBottom: 14 }}>
            <span>Photo / PDF de la facture</span>
            {isEdit && base.photo && (
              <div style={{ marginBottom: 6, fontSize: 12 }}>
                Actuel :&nbsp;
                <a href={absUrl(base.photo)} target="_blank" rel="noreferrer" style={{ color: "var(--steel-2)" }}>
                  Voir le fichier
                </a>
              </div>
            )}
            <label className="upload-zone">
              <Upload size={20} strokeWidth={1.5} />
              <span>
                {photo
                  ? photo.name
                  : isEdit && base.photo
                    ? "Cliquez pour remplacer le fichier"
                    : "Cliquez ou glissez un fichier ici"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!canSave}>
            {isEdit ? "Enregistrer les modifications" : "Enregistrer la facture"}
          </button>
        </div>
      </div>
    </div>
  );
}
