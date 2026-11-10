import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { FIELD_LABELS } from "../lib/format.js";

function ClientHistory({ clientId, onLoadHistory }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    onLoadHistory(clientId)
      .then((r) => setEntries(r.results ?? r))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [clientId, onLoadHistory, open]);

  const count = entries.length;

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <button className="link" style={{ fontSize: 12 }} onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} Historique{count ? ` (${count} action${count > 1 ? "s" : ""})` : ""}
      </button>
      {open && (
        <div className="audit-list">
          {loading && <div className="muted" style={{ fontSize: 12 }}>Chargement…</div>}
          {!loading && entries.length === 0 && (
            <div className="muted" style={{ fontSize: 12 }}>Aucun historique enregistré.</div>
          )}
          {entries.map((e) => (
            <div key={e.id} className={`audit-entry${e.status === "FAILED" ? " audit-fail" : ""}`}>
              <div className="audit-header">
                <span className={`audit-badge ${e.action === "CREATION" ? "audit-create" : "audit-modify"}`}>
                  {e.action === "CREATION" ? "Création" : "Modification"}
                </span>
                <span className="audit-time">
                  {new Date(e.timestamp).toLocaleString("fr-TN")}
                </span>
                {e.status === "FAILED" && <span className="danger" style={{ fontSize: 11 }}>ÉCHEC</span>}
              </div>
              {Array.isArray(e.fields) && e.fields.length > 0 && (
                <ul className="audit-fields">
                  {e.fields.map((f) => (
                    <li key={f.field}>
                      <strong>{FIELD_LABELS[f.field] || f.field}</strong>
                      {" : "}
                      <span className="audit-old">{f.oldValue || "—"}</span>
                      {" → "}
                      <span className="audit-new">{f.newValue || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientEditor({ base, onClose, onSave, onLoadHistory }) {
  const isNew = !base;
  // Use || (not ??) so an empty-string surname also triggers the split fallback.
  // This handles legacy records where the backend returns surname: "" or surname: null.
  const _apiSurname = (base?.surname && base.surname.trim())
    || (base?.last_name && base.last_name.trim())
    || null;
  const _fullName = base?.name ? base.name.trim() : "";
  const _spaceIdx  = _fullName.indexOf(" ");
  const [name, setName] = useState(
    _apiSurname !== null ? _fullName
      : (_spaceIdx >= 0 ? _fullName.slice(0, _spaceIdx) : _fullName)
  );
  const [surname, setSurname] = useState(
    _apiSurname !== null ? _apiSurname
      : (_spaceIdx >= 0 ? _fullName.slice(_spaceIdx + 1) : "")
  );
  const [kind, setKind] = useState(base?.kind || "individual");
  const [phone, setPhone] = useState(base?.phone || "");
  const [cin, setCin] = useState(base?.cin || base?.CIN || "");
  const [car, setCar] = useState(base?.car || base?.Car || "");
  const [aka, setAka] = useState(base?.aka || base?.Aka || base?.AKA || "");
  const [email, setEmail] = useState(base?.email || "");
  const [creditLimit, setCreditLimit] = useState(base?.credit_limit || 0);
  const [notes, setNotes] = useState(base?.notes || "");

  const canSave = name.trim().length > 0 && phone.trim().length > 0 && cin.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSave({
      id: base?.id || null,
      body: {
        name: name.trim(),
        surname: surname.trim(),
        kind,
        phone: phone.trim(),
        cin: cin.trim(),
        car: car.trim(),
        aka: aka.trim(),
        email: email.trim(),
        credit_limit: String(creditLimit || 0),
        notes: notes.trim(),
      },
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? "Nouveau client" : `Modifier ${[name, surname].filter(Boolean).join(" ") || base.name}`}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label className="field">
              <span className="req">Nom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <label className="field">
              <span>Prénom</span>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="individual">Particulier</option>
                <option value="garage">Garage</option>
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="req">Téléphone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="field">
              <span className="req">CIN</span>
              <input value={cin} onChange={(e) => setCin(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Voiture</span>
              <input value={car} onChange={(e) => setCar(e.target.value)} placeholder="Marque / modèle" />
            </label>
            <label className="field">
              <span>AKA</span>
              <input value={aka} onChange={(e) => setAka(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Plafond de crédit</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </label>

          {!isNew && <ClientHistory clientId={base.id} onLoadHistory={onLoadHistory} />}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!canSave}>
            {isNew ? "Créer le client" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
