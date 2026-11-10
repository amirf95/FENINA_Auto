import { AlertCircle, CheckCircle2, Clock, Phone } from "lucide-react";
import { fmt } from "../lib/format.js";

export default function Reminders({ reminders, loading, onMarkSent }) {
  const overdue  = reminders.filter((r) => r.days_overdue > 0).sort((a, b) => b.days_overdue - a.days_overdue);
  const upcoming = reminders.filter((r) => r.days_overdue <= 0);

  if (loading) {
    return <div className="page"><div className="empty big" style={{ marginTop: 80 }}>Chargement…</div></div>;
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Suivi des paiements</div>
          <h1>Rappels</h1>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2><AlertCircle size={16} className="danger" /> En retard ({overdue.length})</h2>
        </div>
        {overdue.length === 0 ? (
          <div className="empty">Aucun retard de paiement.</div>
        ) : (
          <ul className="reminder-list big">
            {overdue.map((r) => (
              <li key={r.id}>
                <div className="rem-dot danger" />
                <div className="rem-body">
                  <div className="rem-top">
                    <strong>{r.client_name}</strong>
                    <span className="rem-owed danger">{fmt(r.amount_due)}</span>
                  </div>
                  <div className="rem-meta">
                    <span className="mono">{r.invoice_number}</span>
                    {" · "}<span className="danger">retard de {r.days_overdue} j</span>
                    {r.client_phone && <> · <Phone size={12} /> {r.client_phone}</>}
                  </div>
                </div>
                <button
                  className={`btn small${r.sent ? " ghost" : ""}`}
                  onClick={() => !r.sent && onMarkSent(r.id)}
                  disabled={r.sent}
                >
                  {r.sent
                    ? <><CheckCircle2 size={13} /> Envoyé</>
                    : "Envoyer un rappel"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2><Clock size={16} /> À échoir ({upcoming.length})</h2>
          </div>
          <ul className="reminder-list big">
            {upcoming.map((r) => (
              <li key={r.id}>
                <div className="rem-dot" />
                <div className="rem-body">
                  <div className="rem-top">
                    <strong>{r.client_name}</strong>
                    <span className="rem-owed">{fmt(r.amount_due)}</span>
                  </div>
                  <div className="rem-meta">
                    <span className="mono">{r.invoice_number}</span>
                    {" · dans "}{Math.abs(r.days_overdue)} j
                  </div>
                </div>
                <button
                  className="btn small ghost"
                  onClick={() => onMarkSent(r.id)}
                  disabled={r.sent}
                >
                  {r.sent ? "Envoyé" : "Rappel anticipé"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
