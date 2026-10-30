import type { DamageType, ReportStatus, SeverityClass } from "./types";

export const damageLabels: Record<DamageType, string> = {
  NID_DE_POULE: "Nid-de-poule",
  FISSURE: "Fissure",
  AFFAISSEMENT: "Affaissement",
  ORNIERE: "Ornière",
  EROSION: "Érosion",
  AUTRE: "Autre",
};

export const damageColors: Record<DamageType, string> = {
  NID_DE_POULE: "#0f766e",
  FISSURE: "#f59e0b",
  AFFAISSEMENT: "#dc2626",
  ORNIERE: "#7c3aed",
  EROSION: "#b45309",
  AUTRE: "#64748b",
};

export const severityLabels: Record<SeverityClass, string> = {
  LEGERE: "Légère",
  MODEREE: "Modérée",
  GRAVE: "Grave",
  CRITIQUE: "Critique",
};

export const severityColors: Record<SeverityClass, string> = {
  LEGERE: "#16a34a",
  MODEREE: "#eab308",
  GRAVE: "#f97316",
  CRITIQUE: "#dc2626",
};

export const severityStyles: Record<SeverityClass, string> = {
  LEGERE: "bg-green-100 text-green-800 ring-green-200",
  MODEREE: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  GRAVE: "bg-orange-100 text-orange-800 ring-orange-200",
  CRITIQUE: "bg-red-100 text-red-800 ring-red-200",
};

export const statusLabels: Record<ReportStatus, string> = {
  NOUVEAU: "Nouveau",
  CONFIRME: "Confirmé",
  EN_REPARATION: "En réparation",
  REPARE: "Réparé",
  REJETE: "Rejeté",
};

export const statusStyles: Record<ReportStatus, string> = {
  NOUVEAU: "bg-blue-100 text-blue-800 ring-blue-200",
  CONFIRME: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  EN_REPARATION: "bg-amber-100 text-amber-800 ring-amber-200",
  REPARE: "bg-green-100 text-green-800 ring-green-200",
  REJETE: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function formatMonth(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(
    new Date(`${value}-01T00:00:00`),
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatCoord(value: number) {
  return value.toFixed(5);
}
