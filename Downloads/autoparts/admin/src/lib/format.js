export const fmt = (n) =>
  new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    .format(Number(n) || 0) + " DT";

export const clientFullName = (client) =>
  [client?.name, client?.surname].filter(Boolean).join(" ").trim();

export const statusMeta = {
  paid:    { label: "Payée",    cls: "st-paid" },
  unpaid:  { label: "Impayée", cls: "st-unpaid" },
  partial: { label: "Partielle", cls: "st-partial" },
};

export const FIELD_LABELS = {
  name: "Nom", surname: "Prénom", phone: "Téléphone",
  cin: "CIN", car: "Voiture", aka: "AKA", email: "Email",
  credit_limit: "Plafond de crédit", notes: "Notes", kind: "Type",
};

export const ROLE_LABELS = { owner: "Gérant", manager: "Responsable", employee: "Employé" };

export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
