import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, mediaUrl } from "../lib/api";
import {
  damageLabels,
  formatCoord,
  formatDate,
  severityLabels,
  statusLabels,
} from "../lib/format";
import type {
  DamageType,
  Paginated,
  Report,
  ReportStatus,
  SeverityClass,
} from "../lib/types";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";

const damageTypes = Object.keys(damageLabels) as DamageType[];
const severityClasses = Object.keys(severityLabels) as SeverityClass[];
const statuses = Object.keys(statusLabels) as ReportStatus[];

export function ReportsPage() {
  const [filters, setFilters] = useState({
    status: "",
    severityClass: "",
    damageType: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Report> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editStatus, setEditStatus] = useState<ReportStatus>("NOUVEAU");
  const [editSeverity, setEditSeverity] = useState<SeverityClass | "">("");
  const [editScore, setEditScore] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput.trim() }));
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.listReports({
        page,
        pageSize: 15,
        status: filters.status,
        severityClass: filters.severityClass,
        damageType: filters.damageType,
        search: filters.search,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function openReport(report: Report) {
    setSelected(report);
    setEditStatus(report.status);
    setEditSeverity(report.severityClass ?? "");
    setEditScore(report.severityScore !== null ? String(report.severityScore) : "");
  }

  async function saveReport() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateReport(selected.id, {
        status: editStatus,
        severityClass: editSeverity === "" ? null : editSeverity,
        severityScore: editScore === "" ? null : Number(editScore),
      });
      setSelected(updated);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => (item.id === updated.id ? updated : item)),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  }

  async function removeReport() {
    if (!selected) return;
    if (!window.confirm("Supprimer définitivement ce signalement ?")) return;
    setDeleting(true);
    try {
      await api.deleteReport(selected.id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setDeleting(false);
    }
  }

  async function exportCsv() {
    try {
      const blob = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "signalements-projetemma.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export impossible");
    }
  }

  function changeFilter(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Signalements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consultez, filtrez et traitez les dégradations signalées.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportCsv()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher (ville, route, description...)"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <select
            value={filters.status}
            onChange={(event) => changeFilter("status", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Tous les statuts</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <select
            value={filters.severityClass}
            onChange={(event) => changeFilter("severityClass", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Toutes les gravités</option>
            {severityClasses.map((severity) => (
              <option key={severity} value={severity}>
                {severityLabels[severity]}
              </option>
            ))}
          </select>
          <select
            value={filters.damageType}
            onChange={(event) => changeFilter("damageType", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 md:col-span-2"
          >
            <option value="">Tous les types</option>
            {damageTypes.map((type) => (
              <option key={type} value={type}>
                {damageLabels[type]}
              </option>
            ))}
          </select>
          <div className="flex items-center text-sm text-slate-500 md:col-span-2">
            {data ? `${data.total} signalement(s)` : ""}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            Aucun signalement ne correspond à ces filtres.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Localisation</th>
                    <th className="px-4 py-3 font-semibold">Gravité</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Photos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => openReport(report)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {damageLabels[report.damageType]}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {report.city ?? report.region ?? "Lieu inconnu"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {report.roadName ?? `${formatCoord(report.latitude)}, ${formatCoord(report.longitude)}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={report.severityClass} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{report.photos.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => openReport(report)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {damageLabels[report.damageType]}
                      </p>
                      <SeverityBadge severity={report.severityClass} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.city ?? report.region ?? "Lieu inconnu"} ·{" "}
                      {formatDate(report.createdAt)}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={report.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {data && data.total > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <p className="text-slate-500">
              Page {data.page} sur {data.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                type="button"
                disabled={page >= data.pages}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 disabled:opacity-40"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {damageLabels[selected.damageType]}
                </h2>
                <p className="text-xs text-slate-500">{formatDate(selected.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Localisation
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selected.city ?? "Ville inconnue"}
                    {selected.region ? ` · ${selected.region}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selected.roadName ?? "Route non précisée"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {formatCoord(selected.latitude)}, {formatCoord(selected.longitude)}
                  </p>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=17/${selected.latitude}/${selected.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Voir sur la carte
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Détails
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    Taille estimée :{" "}
                    {selected.sizeEstimate !== null ? `${selected.sizeEstimate} m²` : "non précisée"}
                  </p>
                  <p className="text-sm text-slate-800">
                    Signalé par : {selected.reporterName ?? "anonyme"}
                  </p>
                  {selected.reporterPhone ? (
                    <p className="text-sm text-slate-800">Téléphone : {selected.reporterPhone}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SeverityBadge severity={selected.severityClass} />
                    <StatusBadge status={selected.status} />
                  </div>
                  {selected.severityScore !== null ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Score de gravité : {selected.severityScore.toFixed(0)}/100
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                  {selected.description ?? "Aucune description fournie."}
                </p>
              </div>

              {selected.photos.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Photos ({selected.photos.length})
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selected.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={mediaUrl(photo.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded-xl border border-slate-200"
                      >
                        <img
                          src={mediaUrl(photo.url)}
                          alt="Photo du signalement"
                          className="h-full w-full object-cover transition hover:scale-105"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-900">Traitement du signalement</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Statut</label>
                    <select
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as ReportStatus)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Gravité</label>
                    <select
                      value={editSeverity}
                      onChange={(event) =>
                        setEditSeverity(event.target.value as SeverityClass | "")
                      }
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">Non analysé</option>
                      {severityClasses.map((severity) => (
                        <option key={severity} value={severity}>
                          {severityLabels[severity]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editScore}
                      onChange={(event) => setEditScore(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void removeReport()}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveReport()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
