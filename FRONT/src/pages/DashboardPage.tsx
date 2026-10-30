import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPinned,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api } from "../lib/api";
import {
  damageColors,
  damageLabels,
  formatDate,
  formatMonth,
  formatNumber,
  severityColors,
  severityLabels,
} from "../lib/format";
import type { Report, Summary, Trends } from "../lib/types";
import { ReportsMap } from "../components/ReportsMap";
import { StatCard } from "../components/StatCard";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Spinner } from "../components/Spinner";

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [recent, setRecent] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, trendsData, reportsData] = await Promise.all([
        api.summary(),
        api.trends(),
        api.listReports({ pageSize: 5 }),
      ]);
      setSummary(summaryData);
      setTrends(trendsData);
      setRecent(reportsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const damageData = useMemo(
    () =>
      (summary?.byDamageType ?? []).map((item) => ({
        name: damageLabels[item.damageType],
        value: item.count,
        color: damageColors[item.damageType],
      })),
    [summary],
  );

  const regionData = useMemo(
    () =>
      (summary?.byRegion ?? [])
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((item) => ({ region: item.region, count: item.count })),
    [summary],
  );

  const trendData = useMemo(() => {
    if (!trends) return [];
    return [
      ...trends.months.map((item) => ({
        month: formatMonth(item.month),
        signalements: item.count,
        prevision: null as number | null,
      })),
      ...trends.forecast.map((item) => ({
        month: formatMonth(item.month),
        signalements: null as number | null,
        prevision: item.count,
      })),
    ];
  }, [trends]);

  const unresolved = summary?.totals.unresolved ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue d'ensemble des signalements routiers et des analyses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="mt-1 text-xs">
              Vérifiez que le service d'analyse Python est lancé sur le port 8000.
            </p>
          </div>
        </div>
      ) : null}

      {loading && !summary ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-9 w-9" />
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Signalements"
              value={formatNumber(summary.totals.reports)}
              hint="Total collecté"
              icon={<MapPinned className="h-5 w-5" />}
              accent="emerald"
            />
            <StatCard
              label="30 derniers jours"
              value={formatNumber(summary.totals.last30d)}
              hint="Nouveaux signalements"
              icon={<TrendingUp className="h-5 w-5" />}
              accent="blue"
            />
            <StatCard
              label="Gravité moyenne"
              value={
                summary.totals.avgSeverity !== null
                  ? `${summary.totals.avgSeverity.toFixed(0)}/100`
                  : "—"
              }
              hint="Score calculé par l'analyse"
              icon={<Activity className="h-5 w-5" />}
              accent="amber"
            />
            <StatCard
              label="Non résolus"
              value={formatNumber(unresolved)}
              hint={`dont ${summary.totals.critical} critiques`}
              icon={<Clock className="h-5 w-5" />}
              accent="red"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Types de dégradation</h2>
              <p className="text-xs text-slate-500">Répartition des signalements</p>
              <div className="mt-2">
                <PieChart width={250} height={200}>
                  <Pie
                    data={damageData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {damageData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {damageData.map((item) => (
                  <li key={item.name} className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-bold text-slate-900">Signalements par région</h2>
              <p className="text-xs text-slate-500">Top 8 des régions les plus touchées</p>
              <div className="mt-3 overflow-x-auto">
                {regionData.length > 0 ? (
                  <BarChart width={550} height={250} data={regionData} margin={{ bottom: 30, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="region"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Signalements" fill="#059669" radius={[4, 4, 0, 0]} minPointSize={1} />
                  </BarChart>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Évolution mensuelle</h2>
                <p className="text-xs text-slate-500">
                  Historique et projection à 3 mois (régression linéaire)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-emerald-600" /> Réel
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" /> Prévision
                </span>
              </div>
            </div>
              <div className="mt-3 overflow-x-auto">
                {trendData.length > 0 ? (
                  <LineChart width={700} height={250} data={trendData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="signalements"
                      name="Signalements"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevision"
                      name="Prévision"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:col-span-5 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Carte des signalements</h2>
                  <p className="text-xs text-slate-500">Couleur = gravité analysée</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {Object.entries(severityLabels).map(([key, label]) => (
                    <span key={key} className="flex items-center gap-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: severityColors[key as keyof typeof severityColors] }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <ReportsMap points={summary.recentPoints} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Derniers signalements</h2>
                <Link
                  to="/admin/signalements"
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Tout voir
                </Link>
              </div>
              <ul className="mt-3 space-y-3">
                {recent.length === 0 ? (
                  <li className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    Aucun signalement pour le moment.
                  </li>
                ) : (
                  recent.map((report) => (
                    <li key={report.id}>
                      <Link
                        to="/admin/signalements"
                        className="block rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {damageLabels[report.damageType]} · {report.city ?? report.region ?? "Lieu inconnu"}
                          </p>
                          <SeverityBadge severity={report.severityClass} />
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-slate-500">
                            {report.roadName ?? "Route non précisée"} · {formatDate(report.createdAt)}
                          </p>
                          <StatusBadge status={report.status} />
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Les signalements publics arrivent ici sans qu'aucun compte ne soit nécessaire.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
