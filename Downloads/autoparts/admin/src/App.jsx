import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, Bell, Users, Package, Settings,
  Moon, Sun,
} from "lucide-react";
import "./styles.css";

import { apiPath } from "./lib/api.js";
import { clientFullName } from "./lib/format.js";
import { useApiClient } from "./hooks/useApiClient.js";

import LoginScreen from "./components/LoginScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Invoices from "./components/Invoices.jsx";
import InvoiceEditor from "./components/InvoiceEditor.jsx";
import InvoiceViewer from "./components/InvoiceViewer.jsx";
import InvoiceTypePicker from "./components/InvoiceTypePicker.jsx";
import ExistingInvoiceEditor from "./components/ExistingInvoiceEditor.jsx";
import Reminders from "./components/Reminders.jsx";
import Clients from "./components/Clients.jsx";
import ClientEditor from "./components/ClientEditor.jsx";
import Stock from "./components/Stock.jsx";
import PartEditor from "./components/PartEditor.jsx";
import StockAdjustModal from "./components/StockAdjustModal.jsx";
import SettingsPage from "./components/SettingsPage.jsx";

// ─────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────
export default function FeninaAdmin() {
  const { auth, call, callForm, login, logout } = useApiClient();
  const [theme, setTheme] = useState(() => localStorage.getItem("fenina_theme") || "dark");
  const [tab, setTab] = useState("dashboard");
  const [dashData, setDashData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesNext, setInvoicesNext] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientsNext, setClientsNext] = useState(null);
  const [query, setQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [invoiceSort, setInvoiceSort] = useState("date-asc");
  const [clientSort, setClientSort]   = useState("debt-desc");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [clientEditing, setClientEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Stock / inventory ──
  const [parts, setParts] = useState([]);
  const [partsNext, setPartsNext] = useState(null);
  const [partsQuery, setPartsQuery] = useState("");
  const [partsSort, setPartsSort] = useState("name-asc");
  const [stockFilter, setStockFilter] = useState(""); // "" | "low" | "out"
  const [alerts, setAlerts] = useState({ out_of_stock_count: 0, low_stock_count: 0, out_of_stock: [], low_stock: [] });
  const [salesStats, setSalesStats] = useState(null);
  const [partEditing, setPartEditing] = useState(null); // null | {} | part
  const [adjustingPart, setAdjustingPart] = useState(null); // { part, sign }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fenina_theme", theme);
  }, [theme]);

  const notify = useCallback((msg, isErr = false) => {
    setToast({ msg, err: isErr });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Load clients + invoices once after login so both are available on any tab
  useEffect(() => {
    if (!auth) return;
    Promise.all([
      call("/clients/"),
      call("/invoices/?ordering=-issue_date"),
      call("/parts/alerts/"),
    ])
      .then(([cliList, invList, alertsData]) => {
        setClients(cliList.results ?? cliList);
        setClientsNext(apiPath(cliList.next));
        setInvoices(invList.results ?? invList);
        setInvoicesNext(apiPath(invList.next));
        setAlerts(alertsData);
      })
      .catch(() => {});
  }, [auth, call]);

  const refreshAlerts = useCallback(() => {
    if (!auth) return;
    call("/parts/alerts/").then(setAlerts).catch(() => {});
  }, [auth, call]);

  // Generic "load next page" for any of the three paginated lists
  const loadMore = useCallback(async (nextUrl, appendTo, setNext) => {
    if (!nextUrl) return;
    setLoadingMore(true);
    try {
      const r = await call(nextUrl);
      appendTo((prev) => [...prev, ...(r.results ?? r)]);
      setNext(apiPath(r.next));
    } catch (e) {
      notify(e.message, true);
    } finally {
      setLoadingMore(false);
    }
  }, [call, notify]);

  const loadMoreInvoices = useCallback(() => loadMore(invoicesNext, setInvoices, setInvoicesNext), [loadMore, invoicesNext]);
  const loadMoreClients  = useCallback(() => loadMore(clientsNext, setClients, setClientsNext), [loadMore, clientsNext]);
  const loadMoreParts    = useCallback(() => loadMore(partsNext, setParts, setPartsNext), [loadMore, partsNext]);

  // Load + search parts, and sales stats, when the Stock tab is active
  useEffect(() => {
    if (!auth || tab !== "stock") return;
    setLoading(true);
    const ordering = {
      "name-asc": "name", "name-desc": "-name",
      "qty-asc": "quantity", "qty-desc": "-quantity",
      "price-desc": "-price",
    }[partsSort] || "name";
    const search = partsQuery ? `&search=${encodeURIComponent(partsQuery)}` : "";
    const filterQs = stockFilter === "low" ? "&low_stock=true" : stockFilter === "out" ? "&out_of_stock=true" : "";
    const timer = setTimeout(() => {
      Promise.all([
        call(`/parts/?ordering=${ordering}${search}${filterQs}`),
        call("/stats/sales/?days=14"),
      ])
        .then(([partList, stats]) => {
          setParts(partList.results ?? partList);
          setPartsNext(apiPath(partList.next));
          setSalesStats(stats);
          setLoading(false);
        })
        .catch((e) => { notify(e.message, true); setLoading(false); });
    }, partsQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [auth, tab, partsQuery, partsSort, stockFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load dashboard + reminders data when tab changes
  useEffect(() => {
    if (!auth) return;
    if (tab === "dashboard") {
      setLoading(true);
      Promise.all([
        call("/dashboard/"),
        call("/invoices/?ordering=-issue_date"),
        call("/reminders/"),
      ])
        .then(([dash, invList, remList]) => {
          setDashData(dash);
          setInvoices(invList.results ?? invList);
          setInvoicesNext(apiPath(invList.next));
          setReminders(remList.results ?? remList);
        })
        .catch((e) => notify(e.message, true))
        .finally(() => setLoading(false));
    }
    if (tab === "reminders") {
      setLoading(true);
      call("/reminders/")
        .then((r) => setReminders(r.results ?? r))
        .catch((e) => notify(e.message, true))
        .finally(() => setLoading(false));
    }
  }, [auth, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load + search invoices (immediate on tab switch, debounced on keystroke)
  useEffect(() => {
    if (!auth || tab !== "invoices") return;
    setLoading(true);
    const ordering = { "date-desc": "-issue_date", "date-asc": "issue_date" }[invoiceSort] || "-issue_date";
    const search   = query ? `&search=${encodeURIComponent(query)}` : "";
    const timer = setTimeout(() => {
      call(`/invoices/?ordering=${ordering}${search}`)
        .then((r) => { setInvoices(r.results ?? r); setInvoicesNext(apiPath(r.next)); setLoading(false); })
        .catch((e) => { notify(e.message, true); setLoading(false); });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [auth, tab, query, invoiceSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load + search clients (immediate on tab switch, debounced on keystroke)
  useEffect(() => {
    if (!auth || tab !== "clients") return;
    setLoading(true);
    const qs = clientQuery ? `?search=${encodeURIComponent(clientQuery)}` : "";
    const timer = setTimeout(() => {
      call(`/clients/${qs}`)
        .then((r) => { setClients(r.results ?? r); setClientsNext(apiPath(r.next)); setLoading(false); })
        .catch((e) => { notify(e.message, true); setLoading(false); });
    }, clientQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [auth, tab, clientQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = (t) => { setTab(t); setQuery(""); };

  // ── Invoice CRUD ──
  const saveInvoice = async (payload, initialPayment) => {
    try {
      let inv;
      if (payload.id) {
        inv = await call(`/invoices/${payload.id}/`, { method: "PATCH", body: payload.body });
        notify(`Facture ${inv.number} mise à jour`);
      } else {
        inv = await call("/invoices/", { method: "POST", body: payload.body });
        if (initialPayment > 0) {
          await call(`/invoices/${inv.id}/add_payment/`, {
            method: "POST",
            body: { amount: String(initialPayment), method: "cash" },
          });
          inv = await call(`/invoices/${inv.id}/`);
        }
        notify(`Facture ${inv.number} créée`);
      }
      setInvoices((prev) => {
        const exists = prev.find((p) => p.id === inv.id);
        return exists ? prev.map((p) => p.id === inv.id ? inv : p) : [inv, ...prev];
      });
      setEditing(null);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const deleteInvoice = async (id, number) => {
    try {
      await call(`/invoices/${id}/`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((p) => p.id !== id));
      notify(`Facture ${number} supprimée`);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const saveClient = async (payload) => {
    try {
      const client = payload.id
        ? await call(`/clients/${payload.id}/`, { method: "PATCH", body: payload.body })
        : await call("/clients/", { method: "POST", body: payload.body });

      setClients((prev) => {
        const exists = prev.find((c) => c.id === client.id);
        return exists ? prev.map((c) => c.id === client.id ? client : c) : [client, ...prev];
      });

      notify(`Client ${clientFullName(client)} enregistré`);
      setClientEditing(null);
      return client;
    } catch (e) {
      notify(e.message, true);
      throw e;
    }
  };

  const createClient = async (payload) => {
    try {
      const client = await call("/clients/", { method: "POST", body: payload.body });
      setClients((prev) => [client, ...prev]);
      notify(`Client ${clientFullName(client)} créé`);
      return client;
    } catch (e) {
      notify(e.message, true);
      throw e;
    }
  };

  const deleteClient = async (id, name) => {
    try {
      await call(`/clients/${id}/`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== id));
      notify(`Client ${name} supprimé`);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const saveExistingInvoice = async (formData) => {
    try {
      const inv = await callForm("/invoices/register_existing/", formData);
      setInvoices((prev) => [inv, ...prev]);
      setEditing(null);
      notify(`Facture ${inv.number} enregistrée`);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const saveExistingInvoicePatch = async (id, formData) => {
    try {
      const inv = await callForm(`/invoices/${id}/`, formData, "PATCH");
      setInvoices((prev) => prev.map((p) => p.id === inv.id ? inv : p));
      setEditing(null);
      notify(`Facture ${inv.number} mise à jour`);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const markReminderSent = async (id) => {
    try {
      const updated = await call(`/reminders/${id}/mark_sent/`, { method: "POST" });
      setReminders((prev) => prev.map((r) => r.id === id ? updated : r));
      notify("Rappel marqué comme envoyé");
    } catch (e) {
      notify(e.message, true);
    }
  };

  // ── Stock / parts CRUD ──
  const savePart = async (payload) => {
    try {
      const part = payload.id
        ? await call(`/parts/${payload.id}/`, { method: "PATCH", body: payload.body })
        : await call("/parts/", { method: "POST", body: payload.body });
      setParts((prev) => {
        const exists = prev.find((p) => p.id === part.id);
        return exists ? prev.map((p) => p.id === part.id ? part : p) : [part, ...prev];
      });
      notify(`Pièce ${part.name} enregistrée`);
      setPartEditing(null);
      refreshAlerts();
    } catch (e) {
      notify(e.message, true);
      throw e;
    }
  };

  const deletePart = async (id, name) => {
    try {
      await call(`/parts/${id}/`, { method: "DELETE" });
      setParts((prev) => prev.filter((p) => p.id !== id));
      notify(`Pièce ${name} supprimée`);
      refreshAlerts();
    } catch (e) {
      notify(e.message, true);
    }
  };

  const adjustPartStock = async (id, delta, reason, note) => {
    try {
      const part = await call(`/parts/${id}/adjust_stock/`, {
        method: "POST",
        body: { delta, reason, note },
      });
      setParts((prev) => prev.map((p) => p.id === part.id ? part : p));
      notify(`Stock de ${part.name} ajusté (${delta > 0 ? "+" : ""}${delta})`);
      setAdjustingPart(null);
      refreshAlerts();
    } catch (e) {
      notify(e.message, true);
      throw e;
    }
  };

  if (!auth) {
    return <LoginScreen onLogin={login} />;
  }

  const overdueReminders = [...reminders]
    .filter((r) => r.days_overdue > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue);
  const overdueCount = overdueReminders.length;
  // Front-desk employees can create/edit records but shouldn't delete them —
  // owners and managers keep full control.
  const canDelete = auth.user?.role !== "employee";

  const todayLabel = new Date().toLocaleDateString("fr-TN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const firstName = auth.user?.first_name || auth.user?.full_name?.split(" ")[0] || "Amir";
  const initials = (auth.user?.first_name?.[0] || "A") + (auth.user?.last_name?.[0] || "F");

  return (
    <div className="fenina">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">Fenina</div>
            <div className="brand-sub">Espace gérant</div>
          </div>
        </div>
        <nav>
          {[
            ["dashboard", LayoutDashboard, "Tableau de bord", null],
            ["invoices",  FileText,        "Factures",         invoices.length || null],
            ["reminders", Bell,            "Rappels",          overdueCount || null],
            ["clients",   Users,           "Clients",          null],
            ["stock",     Package,         "Stock",            (alerts.out_of_stock_count + alerts.low_stock_count) || null],
            ["settings",  Settings,        "Réglages",         null],
          ].map(([key, Icon, label, badge]) => (
            <button
              key={key}
              className={`navitem ${tab === key ? "active" : ""}`}
              onClick={() => switchTab(key)}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
              {badge != null && (
                <span className={`nav-badge${key === "stock" && alerts.out_of_stock_count > 0 ? " nav-badge-danger" : ""}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <div className="who-avatar">{initials}</div>
            <div>
              <div className="who-name">{auth.user?.full_name || "Amir Fenina"}</div>
              <div className="who-role">{auth.user?.role_label || "Gérant"}</div>
            </div>
          </div>
          <div className="theme-toggle">
            <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")} title="Thème sombre">
              <Moon size={13} /> Sombre
            </button>
            <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")} title="Thème clair">
              <Sun size={13} /> Clair
            </button>
          </div>
          <button className="btn ghost small logout-btn" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {tab === "dashboard" && (
          <Dashboard
            dashData={dashData}
            allInvoices={invoices}
            allClients={clients}
            overdueReminders={overdueReminders}
            overdueCount={overdueCount}
            todayLabel={todayLabel}
            firstName={firstName}
            loading={loading}
            goReminders={() => switchTab("reminders")}
            goInvoices={() => switchTab("invoices")}
            goClients={() => switchTab("clients")}
            goStock={() => switchTab("stock")}
          />
        )}
        {tab === "invoices" && (
          <Invoices
            invoices={invoices}
            query={query}
            setQuery={setQuery}
            sort={invoiceSort}
            setSort={setInvoiceSort}
            loading={loading}
            onNew={() => setEditing("picker")}
            onView={(inv) => setViewing(inv)}
            onEdit={(inv) => setEditing(inv)}
            onDelete={deleteInvoice}
            canDelete={canDelete}
            hasMore={!!invoicesNext}
            loadingMore={loadingMore}
            onLoadMore={loadMoreInvoices}
          />
        )}
        {tab === "reminders" && (
          <Reminders
            reminders={reminders}
            loading={loading}
            onMarkSent={markReminderSent}
          />
        )}
        {tab === "clients" && (
          <Clients
            clients={clients}
            query={clientQuery}
            setQuery={setClientQuery}
            sort={clientSort}
            setSort={setClientSort}
            allInvoices={invoices}
            loading={loading}
            onNew={() => setClientEditing({})}
            onEdit={(client) => setClientEditing(client)}
            onDelete={deleteClient}
            canDelete={canDelete}
            hasMore={!!clientsNext}
            loadingMore={loadingMore}
            onLoadMore={loadMoreClients}
          />
        )}
        {tab === "stock" && (
          <Stock
            parts={parts}
            alerts={alerts}
            salesStats={salesStats}
            query={partsQuery}
            setQuery={setPartsQuery}
            sort={partsSort}
            setSort={setPartsSort}
            filter={stockFilter}
            setFilter={setStockFilter}
            loading={loading}
            onNew={() => setPartEditing({})}
            onEdit={(part) => setPartEditing(part)}
            onDelete={deletePart}
            onAdjust={(part, sign) => setAdjustingPart({ part, sign })}
            canDelete={canDelete}
            hasMore={!!partsNext}
            loadingMore={loadingMore}
            onLoadMore={loadMoreParts}
          />
        )}
        {tab === "settings" && (
          <SettingsPage
            user={auth.user}
            theme={theme}
            setTheme={setTheme}
            invoices={invoices}
            clients={clients}
            parts={parts}
            call={call}
            notify={notify}
          />
        )}
      </main>

      {editing === "picker" && (
        <InvoiceTypePicker
          onNew={() => setEditing("new")}
          onExisting={() => setEditing("existing")}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing !== "picker" && editing !== "existing" && !editing?.is_existing && (
        <InvoiceEditor
          base={editing === "new" ? null : editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSave={saveInvoice}
          onCreateClient={createClient}
        />
      )}
      {(editing === "existing" || editing?.is_existing) && (
        <ExistingInvoiceEditor
          base={editing?.is_existing ? editing : null}
          clients={clients}
          onClose={() => setEditing(null)}
          onSave={saveExistingInvoice}
          onSavePatch={saveExistingInvoicePatch}
          onCreateClient={createClient}
        />
      )}
      {clientEditing && (
        <ClientEditor
          base={clientEditing.id ? clientEditing : null}
          onClose={() => setClientEditing(null)}
          onSave={saveClient}
          onLoadHistory={(id) => call(`/clients/${id}/history/`)}
        />
      )}

      {viewing && (
        <InvoiceViewer
          inv={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setViewing(null); setEditing(viewing); }}
        />
      )}

      {partEditing && (
        <PartEditor
          base={partEditing.id ? partEditing : null}
          onClose={() => setPartEditing(null)}
          onSave={savePart}
          call={call}
        />
      )}

      {adjustingPart && (
        <StockAdjustModal
          part={adjustingPart.part}
          sign={adjustingPart.sign}
          onClose={() => setAdjustingPart(null)}
          onSave={adjustPartStock}
        />
      )}

      {toast && (
        <div className={`toast${toast.err ? " toast-err" : ""}`}>{toast.msg}</div>
      )}
    </div>
  );
}
