import { useState } from "react";
import { Plus, X } from "lucide-react";
import { fmt, clientFullName, statusMeta } from "../lib/format.js";

export default function InvoiceEditor({ base, clients, onClose, onSave, onCreateClient }) {
  const isNew = !base;
  const today = new Date().toISOString().slice(0, 10);

  const [clientSearch, setClientSearch] = useState(base?.client_name || "");
  const [selectedClient, setSelectedClient] = useState(
    base ? {
      id: base.client,
      name: base.client_name,
      phone: base.client_phone,
      cin: base.client_cin || base.client_CIN || "",
      car: base.client_car || base.client_Car || "",
      aka: base.client_aka || base.client_Aka || base.client_AKA || "",
    } : null
  );
  const [showDrop, setShowDrop] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const [newClientName, setNewClientName] = useState("");
  const [newClientSurname,setNewClientSurname]=useState("");
  const [newClientAKA,setNewClientAKA]=useState("");
  const [newClientCAR,setNewClientCAR]=useState("");
  const [newClientCIN,setNewClientCIN]=useState("");
  const [newClientKind, setNewClientKind] = useState("individual");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientCreditLimit, setNewClientCreditLimit] = useState(0);
  const [newClientNotes, setNewClientNotes] = useState("");

  const [issueDate, setIssueDate] = useState(base?.issue_date || today);
  const [dueDate, setDueDate] = useState(base?.due_date || today);

  const createClientFromEditor = async () => {
    if (!newClientName.trim() || !newClientPhone.trim() || !newClientCIN.trim()) return;
    try {
      const client = await onCreateClient({
        body: {
          name: newClientName.trim(),
          surname: newClientSurname.trim(),
          kind: newClientKind,
          phone: newClientPhone.trim(),
          cin: newClientCIN.trim(),
          car: newClientCAR.trim(),
          aka: newClientAKA.trim(),
          email: newClientEmail.trim(),
          credit_limit: String(newClientCreditLimit || 0),
          notes: newClientNotes.trim(),
        },
      });
      if (client) {
        setSelectedClient(client);
        setClientSearch(clientFullName(client));
        setClientModalOpen(false);
        setNewClientName("");
        setNewClientSurname("");
        setNewClientKind("individual");
        setNewClientPhone("");
        setNewClientCIN("");
        setNewClientCAR("");
        setNewClientAKA("");
        setNewClientEmail("");
        setNewClientCreditLimit(0);
        setNewClientNotes("");
      }
    } catch (err) {
      console.error("Unable to create client", err);
    }
  };
  const [editNumber, setEditNumber] = useState(base?.number || "");
  const [lines, setLines] = useState(
    base?.lines?.length
      ? base.lines.map((l) => ({ description: l.description, quantity: l.quantity, unit_price: l.unit_price }))
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );
  const [initialPayment, setInitialPayment] = useState(0);
  const _q = clientSearch.toLowerCase();
  const filteredClients = clients.filter((c) =>
    clientFullName(c).toLowerCase().includes(_q) ||
    (c.phone || "").includes(clientSearch) ||
    (c.car || c.Car || "").toLowerCase().includes(_q) ||
    (c.cin || c.CIN || "").toLowerCase().includes(_q) ||
    (c.aka || c.Aka || c.AKA || "").toLowerCase().includes(_q)
  );

  const total = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0
  );
  const currentPaid = isNew ? Number(initialPayment) : Number(base.amount_paid);
  const status = currentPaid >= total && total > 0 ? "paid" : currentPaid > 0 ? "partial" : "unpaid";

  const updateLine = (idx, field, val) =>
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  const addLine = () => setLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const canSave = selectedClient && lines.some((l) => l.description.trim()) && total > 0;

  const submit = () => {
    if (!canSave) return;
    onSave(
      {
        id: isNew ? null : base.id,
        body: {
          ...(!isNew && editNumber.trim() ? { number: editNumber.trim() } : {}),
          client: selectedClient.id,
          issue_date: issueDate,
          due_date: dueDate,
          lines: lines
            .filter((l) => l.description.trim())
            .map((l) => ({
              description: l.description,
              quantity: String(l.quantity),
              unit_price: String(l.unit_price),
            })),
        },
      },
      isNew ? Number(initialPayment) : 0,
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? "Nouvelle facture" : `Modifier ${base.number}`}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            {/* Client search dropdown */}
            <div className="field" style={{ position: "relative" }}>
              <span>Client</span>
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
                  <div className="drop-empty" style={{ cursor: "pointer" }} onMouseDown={() => { setClientModalOpen(true); setShowDrop(false); }}>
                    <strong>Créer un nouveau client</strong>
                  </div>
                </div>
              )}
            </div>
            <label className="field">
              <span>Téléphone</span>
              <input
                value={selectedClient?.phone || ""}
                readOnly
                placeholder="Sélectionnez un client"
                style={{ opacity: 0.6 }}
              />
            </label>
            <button
              type="button"
              className="btn small ghost"
              style={{ alignSelf: "flex-end", marginLeft: 12, height: 38 }}
              onClick={() => { setClientModalOpen(true); setShowDrop(false); }}
            >
              + Nouveau client
            </button>
          </div>

          {!isNew && (
            <div className="field-row">
              <label className="field">
                <span>N° Facture</span>
                <input
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  placeholder={base.number}
                  className="mono"
                />
              </label>
              <div className="field" />
            </div>
          )}

          <div className="field-row">
            <label className="field">
              <span>Date d'émission</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Échéance</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          <div className="items-head">
            <span>Articles</span>
            <button className="link" onClick={addLine}><Plus size={14} /> Ajouter une ligne</button>
          </div>
          <div className="items">
            {lines.map((l, idx) => (
              <div className="item-row" key={idx}>
                <input
                  className="it-name"
                  placeholder="Désignation"
                  value={l.description}
                  onChange={(e) => updateLine(idx, "description", e.target.value)}
                />
                <input
                  className="it-qty"
                  type="number"
                  min="0"
                  value={l.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                />
                <input
                  className="it-price"
                  type="number"
                  min="0"
                  step="0.001"
                  value={l.unit_price}
                  onChange={(e) => updateLine(idx, "unit_price", e.target.value)}
                />
                <span className="it-sub">
                  {fmt((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}
                </span>
                <button
                  className="icon-btn delete"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="totals">
            {isNew ? (
              <label className="field paid-field">
                <span>Acompte initial (optionnel)</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                />
              </label>
            ) : (
              <div className="field paid-field">
                <span style={{ fontSize: 12, color: "var(--ink-mut)", fontWeight: 500 }}>
                  Montant payé (enregistré)
                </span>
                <div style={{
                  padding: "9px 11px", background: "var(--bg)",
                  border: "1px solid var(--line)", borderRadius: 8, fontSize: 14,
                }}>
                  {fmt(base.amount_paid)}
                </div>
              </div>
            )}
            <div className="total-box">
              <div className="tb-row"><span>Total</span><strong>{fmt(total)}</strong></div>
              <div className="tb-row">
                <span>Reste à payer</span>
                <strong className={total - currentPaid > 0 ? "warn" : ""}>
                  {fmt(Math.max(0, total - currentPaid))}
                </strong>
              </div>
              <div className={`pill ${statusMeta[status].cls}`}>{statusMeta[status].label}</div>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={submit} disabled={!canSave}>
            {isNew ? "Créer la facture" : "Enregistrer"}
          </button>
        </div>
      </div>
      {clientModalOpen && (
        <div className="modal-backdrop" onClick={() => setClientModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Nouveau client</h3>
              <button className="icon-btn" onClick={() => setClientModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span className="req">Nom</span>
                <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} autoFocus />
              </label>
              <label className="field">
                <span>Prénom</span>
                <input value={newClientSurname} onChange={(e) => setNewClientSurname(e.target.value)} />
              </label>
              <label className="field">
                <span>AKA</span>
                <input value={newClientAKA} onChange={(e) => setNewClientAKA(e.target.value)} />
              </label>
              <label className="field">
                <span>Voiture</span>
                <input value={newClientCAR} onChange={(e) => setNewClientCAR(e.target.value)} />
              </label>
              <label className="field">
                <span className="req">CIN</span>
                <input value={newClientCIN} onChange={(e) => setNewClientCIN(e.target.value)} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Type</span>
                  <select value={newClientKind} onChange={(e) => setNewClientKind(e.target.value)}>
                    <option value="individual">Particulier</option>
                    <option value="garage">Garage</option>
                  </select>
                </label>
                <label className="field">
                  <span className="req">Téléphone</span>
                  <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Plafond de crédit</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={newClientCreditLimit}
                  onChange={(e) => setNewClientCreditLimit(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} rows={4} />
              </label>
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={() => setClientModalOpen(false)}>Annuler</button>
              <button className="btn primary" onClick={createClientFromEditor} disabled={!newClientName.trim() || !newClientPhone.trim() || !newClientCIN.trim()}>
                Créer ce client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
