import { useState } from "react";
import { X } from "lucide-react";

export default function StockAdjustModal({ part, sign, onClose, onSave }) {
  const [amount, setAmount] = useState(1);
  const [dir, setDir] = useState(sign >= 0 ? "in" : "out");
  const [reason, setReason] = useState(sign >= 0 ? "restock" : "adjustment");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const delta = (dir === "in" ? 1 : -1) * Math.abs(Number(amount) || 0);
  const canSave = Math.abs(Number(amount) || 0) > 0;

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave(part.id, delta, reason, note.trim());
    } catch {
      // handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Ajuster le stock — {part.name}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="muted" style={{ marginBottom: 12 }}>Stock actuel : <strong>{part.quantity}</strong></div>

          <div className="field-row">
            <label className="field">
              <span>Sens</span>
              <div className="fs-chips">
                <button className={`sort-chip${dir === "in" ? " on" : ""}`} onClick={() => setDir("in")}>+ Entrée</button>
                <button className={`sort-chip${dir === "out" ? " on" : ""}`} onClick={() => setDir("out")}>− Sortie</button>
              </div>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="req">Quantité</span>
              <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </label>
            <label className="field">
              <span>Motif</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="restock">Réapprovisionnement</option>
                <option value="adjustment">Correction manuelle</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optionnel" />
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!canSave || saving}>
            {dir === "in" ? "Ajouter au stock" : "Retirer du stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
