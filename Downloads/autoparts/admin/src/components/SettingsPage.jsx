import { Download, Moon, ShieldCheck, Sun, Users } from "lucide-react";
import { clientFullName, statusMeta, ROLE_LABELS } from "../lib/format.js";
import { downloadCsv } from "../lib/csv.js";
import { API } from "../lib/api.js";

export default function SettingsPage({ user, theme, setTheme, invoices, clients, parts, call, notify }) {
  const exportInvoices = () => downloadCsv("factures.csv", invoices.map((i) => ({
    numero: i.number, client: i.client_name, date_emission: i.issue_date, echeance: i.due_date,
    total: i.total, paye: i.amount_paid, du: i.amount_due, statut: statusMeta[i.status]?.label || i.status,
  })));
  const exportClients = () => downloadCsv("clients.csv", clients.map((c) => ({
    nom: clientFullName(c), telephone: c.phone, cin: c.cin, voiture: c.car,
    type: c.kind, plafond_credit: c.credit_limit, solde: c.balance,
  })));
  const exportParts = () => downloadCsv("stock.csv", parts.map((p) => ({
    sku: p.sku, nom: p.name, marque: p.brand, categorie: p.category, sous_categorie: p.subcategory,
    prix: p.price, quantite: p.quantity, seuil_reappro: p.reorder_level,
  })));
  const exportInventoryExcel = async () => {
    const res = await fetch(`${API}/parts/export-xlsx/`);
    if (!res.ok) {
      throw new Error("Impossible d'exporter l'inventaire Excel");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventaire_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const sendDailyInventoryEmail = async () => {
    if (!call) return;
    try {
      const result = await call("/parts/send-daily-report/", {
        method: "POST",
        body: { email: user?.email || "" },
      });
      notify?.(result.detail || "Rapport envoyé avec succès.");
    } catch (error) {
      notify?.(error.message || "Impossible d'envoyer le rapport du jour.", true);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Module</div>
          <h1>Réglages</h1>
        </div>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <h2><Users size={15} /> Compte</h2>
          <p className="muted">Informations de connexion.</p>
          <div className="settings-card-body">
            <div className="settings-row">
              <span className="settings-row-label">Nom</span>
              <span className="settings-row-val">{user?.full_name || "—"}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">Email</span>
              <span className="settings-row-val">{user?.email || "—"}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">Rôle</span>
              <span className="role-pill"><ShieldCheck size={12} /> {user?.role_label || ROLE_LABELS[user?.role] || "—"}</span>
            </div>
            {user?.phone && (
              <div className="settings-row">
                <span className="settings-row-label">Téléphone</span>
                <span className="settings-row-val">{user.phone}</span>
              </div>
            )}
          </div>
        </section>

        <section className="settings-card">
          <h2><Sun size={15} /> Apparence</h2>
          <p className="muted">Choisissez le thème de l'interface.</p>
          <div className="theme-toggle" style={{ marginTop: 14 }}>
            <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>
              <Moon size={13} /> Sombre
            </button>
            <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>
              <Sun size={13} /> Clair
            </button>
          </div>
        </section>

        <section className="settings-card">
          <h2><Download size={15} /> Export des données</h2>
          <p className="muted">Téléchargez vos données au format CSV (Excel, comptabilité…).</p>
          <div className="settings-card-body">
            <button className="export-btn" onClick={exportInvoices} disabled={!invoices.length}>
              Factures ({invoices.length}) <Download size={14} />
            </button>
            <button className="export-btn" onClick={exportClients} disabled={!clients.length}>
              Clients ({clients.length}) <Download size={14} />
            </button>
            <button className="export-btn" onClick={exportParts} disabled={!parts.length}>
              Pièces en stock ({parts.length}) <Download size={14} />
            </button>
            <button className="export-btn" onClick={exportInventoryExcel} disabled={!parts.length}>
              Excel complet du stock <Download size={14} />
            </button>
            <button className="export-btn" onClick={sendDailyInventoryEmail} disabled={!parts.length}>
              Envoyer l'inventaire du jour par email <Download size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
