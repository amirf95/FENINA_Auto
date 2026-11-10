import { AlertCircle, Bell, ChevronRight, FileText } from "lucide-react";
import { fmt, clientFullName, statusMeta, DAY_LABELS } from "../lib/format.js";

function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

function ProgressBar({ pct, color = "var(--steel)" }) {
  return (
    <div className="kpi-progress-track">
      <div className="kpi-progress-fill" style={{ "--pct": `${Math.min(pct, 100).toFixed(1)}%`, background: color }} />
    </div>
  );
}

export default function Dashboard({ dashData, allInvoices, allClients, overdueReminders, overdueCount,
                     todayLabel, firstName, loading, goReminders, goInvoices, goClients, goStock }) {
  if (loading || !dashData) {
    return (
      <div className="page">
        <div className="empty big" style={{ marginTop: 80 }}>Chargement…</div>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────
  const totalInvoiced  = allInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid      = allInvoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const top5Debtors = [...allClients]
    .filter((c) => Number(c.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5);
  const maxDebt = Number(top5Debtors[0]?.balance || 1);

  const top5Oldest = [...allInvoices]
    .filter((i) => Number(i.amount_due) > 0)
    .sort((a, b) => a.issue_date.localeCompare(b.issue_date))
    .slice(0, 5);
  const maxOld = daysAgo(top5Oldest[0]?.issue_date || new Date().toISOString().slice(0, 10)) || 1;

  const recentInvoices = [...allInvoices]
    .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
    .slice(0, 5);

  const trend = dashData.revenue_trend || [];
  const maxTrend = Math.max(...trend.map((t) => Number(t.amount)), 1);

  const topAlerts = [...overdueReminders]
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, 5);

  return (
    <div className="page db-page">
      <header className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">{todayLabel}</div>
          <h1 style={{ fontSize: 26 }}>Bonjour, {firstName} 👋</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="db-quick-stat">
            <span className="muted" style={{ fontSize: 12 }}>Factures</span>
            <strong>{allInvoices.length}</strong>
          </div>
          <div className="db-quick-stat">
            <span className="muted" style={{ fontSize: 12 }}>Clients</span>
            <strong>{allClients.length}</strong>
          </div>
        </div>
      </header>

      {/* ── KPI Cards ── */}
      <div className="kpi-strip">
        <div className="kpi-card kpi-a1">
          <div className="kpi-label">Encaissé aujourd'hui</div>
          <div className="kpi-val">{fmt(dashData.revenue_today)}</div>
          <div className="kpi-sub">sur {fmt(dashData.invoiced_today)} facturé · {dashData.invoices_today_count} fact.</div>
        </div>
        <div className="kpi-card kpi-a2">
          <div className="kpi-label">Encours total</div>
          <div className="kpi-val warn">{fmt(dashData.outstanding)}</div>
          <div className="kpi-sub">{allInvoices.filter(i => i.status !== "paid").length} factures non soldées</div>
        </div>
        <div className="kpi-card kpi-a3">
          <div className="kpi-label">Montant en retard</div>
          <div className="kpi-val danger">{fmt(dashData.overdue_total)}</div>
          <div className="kpi-sub">{dashData.overdue_count} facture{dashData.overdue_count !== 1 ? "s" : ""} en retard</div>
        </div>
        <div className="kpi-card kpi-a4">
          <div className="kpi-label">Taux de recouvrement</div>
          <div className="kpi-val" style={{ color: collectionRate >= 70 ? "var(--green)" : "var(--amber)" }}>
            {collectionRate.toFixed(1)} %
          </div>
          <ProgressBar pct={collectionRate}
            color={collectionRate >= 70 ? "var(--green)" : collectionRate >= 40 ? "var(--amber)" : "var(--red)"} />
        </div>
        <div className="kpi-card kpi-a4">
          <div className="kpi-label">Pièces vendues aujourd'hui</div>
          <div className="kpi-val">{dashData.parts_sold_today ?? 0}</div>
          <div className="kpi-sub">unités sorties du stock</div>
        </div>
      </div>

      {/* ── Stock notices ── */}
      {(dashData.out_of_stock_count > 0 || dashData.low_stock_count > 0) && (
        <button className="stock-alert-banner" onClick={goStock}>
          <AlertCircle size={18} />
          <span>
            {dashData.out_of_stock_count > 0 && (
              <strong>{dashData.out_of_stock_count} pièce{dashData.out_of_stock_count !== 1 ? "s" : ""} en rupture de stock</strong>
            )}
            {dashData.out_of_stock_count > 0 && dashData.low_stock_count > 0 && "  ·  "}
            {dashData.low_stock_count > 0 && (
              <span>{dashData.low_stock_count} pièce{dashData.low_stock_count !== 1 ? "s" : ""} bientôt épuisée{dashData.low_stock_count !== 1 ? "s" : ""}</span>
            )}
          </span>
          <ChevronRight size={16} style={{ marginLeft: "auto" }} />
        </button>
      )}

      {/* ── 7-day Revenue Trend ── */}
      {trend.length > 0 && (
        <section className="panel db-trend-panel">
          <div className="panel-head" style={{ paddingBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              📈 Tendance des recettes — 7 derniers jours
            </h2>
            <span className="muted" style={{ fontSize: 12 }}>
              Total: {fmt(trend.reduce((s, t) => s + Number(t.amount), 0))}
            </span>
          </div>
          <div className="trend-chart">
            {trend.map((t, idx) => {
              const pct = maxTrend > 0 ? (Number(t.amount) / maxTrend) * 100 : 0;
              const d = new Date(t.date);
              const isToday = idx === trend.length - 1;
              return (
                <div key={t.date} className="trend-col">
                  <div className="trend-amount">{Number(t.amount) > 0 ? fmt(t.amount) : ""}</div>
                  <div className="trend-bar-wrap">
                    <div
                      className={`trend-bar${isToday ? " today" : ""}`}
                      style={{ "--bar-h": `${Math.max(pct, 2)}%`, animationDelay: `${idx * 60}ms` }}
                    />
                  </div>
                  <div className={`trend-day${isToday ? " today" : ""}`}>
                    {DAY_LABELS[d.getDay()]}
                    {isToday && <span className="trend-today-dot" />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Top 5 rows ── */}
      <div className="cols" style={{ marginBottom: 20 }}>

        {/* Top 5 debtors */}
        <section className="panel">
          <div className="panel-head">
            <h2>🏦 Top 5 — Plus grandes dettes</h2>
            <button className="link" onClick={goClients}>Voir clients <ChevronRight size={14} /></button>
          </div>
          {top5Debtors.length === 0 ? (
            <div className="empty">Aucun client avec solde impayé. ✅</div>
          ) : (
            <ul className="top5-list">
              {top5Debtors.map((c, idx) => {
                const debt = Number(c.balance);
                const pct  = (debt / maxDebt) * 100;
                return (
                  <li key={c.id} className="top5-item" style={{ animationDelay: `${idx * 70}ms` }}>
                    <span className="top5-rank">#{idx + 1}</span>
                    <div className="top5-info">
                      <div className="top5-name">{clientFullName(c)}</div>
                      <div className="top5-bar-wrap">
                        <div className="top5-bar debt-bar" style={{ "--bar-w": `${pct}%`, animationDelay: `${idx * 70 + 150}ms` }} />
                      </div>
                    </div>
                    <span className="top5-val warn">{fmt(debt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top 5 oldest unpaid invoices */}
        <section className="panel">
          <div className="panel-head">
            <h2>🕰️ Top 5 — Factures les plus anciennes</h2>
            <button className="link" onClick={goInvoices}>Voir factures <ChevronRight size={14} /></button>
          </div>
          {top5Oldest.length === 0 ? (
            <div className="empty">Aucune facture impayée. ✅</div>
          ) : (
            <ul className="top5-list">
              {top5Oldest.map((i, idx) => {
                const days = daysAgo(i.issue_date);
                const pct  = (days / maxOld) * 100;
                return (
                  <li key={i.id} className="top5-item" style={{ animationDelay: `${idx * 70}ms` }}>
                    <span className="top5-rank">#{idx + 1}</span>
                    <div className="top5-info">
                      <div className="top5-name">
                        <span className="mono">{i.number}</span>
                        <span className="muted" style={{ fontWeight: 400 }}> · {i.client_name}</span>
                      </div>
                      <div className="top5-bar-wrap">
                        <div className="top5-bar old-bar" style={{ "--bar-w": `${pct}%`, animationDelay: `${idx * 70 + 150}ms` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="top5-val danger">{fmt(i.amount_due)}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{days} j</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Reminders + Recent invoices ── */}
      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <h2><Bell size={16} /> Rappels prioritaires</h2>
            <button className="link" onClick={goReminders}>Tout voir <ChevronRight size={14} /></button>
          </div>
          {topAlerts.length === 0 ? (
            <div className="empty">Aucun rappel en attente. ✅</div>
          ) : (
            <ul className="reminder-list">
              {topAlerts.map((r) => (
                <li key={r.id}>
                  <div className="rem-dot danger" />
                  <div className="rem-body">
                    <div className="rem-top">
                      <strong>{r.client_name}</strong>
                      <span className="rem-owed">{fmt(r.amount_due)}</span>
                    </div>
                    <div className="rem-meta">
                      {r.invoice_number} · en retard de {r.days_overdue} j
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2><FileText size={16} /> Factures récentes</h2>
            <button className="link" onClick={goInvoices}>Tout voir <ChevronRight size={14} /></button>
          </div>
          <ul className="mini-invoices">
            {recentInvoices.map((i) => (
              <li key={i.id}>
                <div className="mi-left">
                  <span className="mi-id">{i.number}</span>
                  <span className="mi-client">{i.client_name}</span>
                </div>
                <div className="mi-right">
                  <span className="mi-total">{fmt(i.total)}</span>
                  <span className={`pill ${statusMeta[i.status].cls}`}>{statusMeta[i.status].label}</span>
                </div>
              </li>
            ))}
            {recentInvoices.length === 0 && <div className="empty">Aucune facture pour l'instant.</div>}
          </ul>
        </section>
      </div>
    </div>
  );
}
