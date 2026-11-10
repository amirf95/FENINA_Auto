import { Archive, FileText, X } from "lucide-react";

export default function InvoiceTypePicker({ onNew, onExisting, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal small" style={{ maxWidth: 520, padding: 30 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head" style={{ border: "none", padding: "0 0 18px" }}>
          <h3 style={{ margin: 0 }}>Type de facture</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <button className="inv-type-card" onClick={onNew}>
            <FileText size={28} strokeWidth={1.5} />
            <strong>Nouvelle facture</strong>
            <span>Créer une facture avec des lignes articles</span>
          </button>
          <button className="inv-type-card" onClick={onExisting}>
            <Archive size={28} strokeWidth={1.5} />
            <strong>Facture existante</strong>
            <span>Enregistrer une facture déjà émise (photo)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
