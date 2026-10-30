import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import {
  damageLabels,
  formatMonth,
  severityColors,
  severityLabels,
} from "../lib/format";
import type { Clusters, Summary, Trends } from "../lib/types";
import { ClustersMap } from "../components/ClustersMap";
import { Spinner } from "../components/Spinner";

export function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [clusters, setClusters] = useState<Clusters | null>(null);
  const [loading, setLoading] = useState(true);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [epsKm, setEpsKm] = useState(0.5);
  const [minSamples, setMinSamples] = useState(2);

  const loadGlobal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, trendsData] = await Promise.all([api.summary(), api.trends()]);
      setSummary(summaryData);
      setTrends(trendsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse indisponible");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClusters = useCallback(async () => {
    setClustersLoading(true);
    try {
      setClusters(await api.clusters({ eps_km: epsKm, min_samples: minSamples }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clustering indisponible");
    } finally {
      setClustersLoading(false);
    }
  }, [epsKm, minSamples]);

  useEffect(() => {
    void loadGlobal();
  }, [loadGlobal]);

  useEffect(() => {
    void loadClusters();
  }, [loadClusters]);

  async function recompute() {
    setRecomputing(true);
    setError("");
    setMessage("");
    try {
      const result = await api.recompute();
      setMessage(`${result.updated} signalement(s) réévalué(s) par le moteur d'analyse.`);
      await Promise.all([loadGlobal(), loadClusters()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalcul impossible");
    } finally {
      setRecomputing(false);
    }
  }

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

  const severityData = useMemo(() => {
    const list = summary?.bySeverity ?? [];
    const order = ["CRITIQUE", "GRAVE", "MODEREE", "FAIBLE"];
    return [...list]
      .map((item) => ({
        name: severityLabels[item.severityClass] || item.severityClass,
        severityClass: item.severityClass,
        count: Number(item.count) || 0,
        color: severityColors[item.severityClass] || "#94a3b8",
      }))
      .sort((a, b) => {
        const ai = order.indexOf(a.severityClass);
        const bi = order.indexOf(b.severityClass);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }, [summary]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Analyse statistique
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Classification de la gravité, regroupement spatial et prévision des signalements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recompute()}
          disabled={recomputing}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {recomputing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}
          {recomputing ? "Analyse en cours..." : "Relancer l'analyse"}
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="mt-1 text-xs">
              Le service d'analyse Python doit être lancé (uvicorn sur le port 8000).
            </p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Spinner className="h-9 w-9" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-bold text-slate-900">Évolution et projection</h2>
              <p className="text-xs text-slate-500">
                Nombre de signalements par mois, avec prévision linéaire à 3 mois.
              </p>
              <div className="mt-3 overflow-x-auto">
                {trendData.length > 0 ? (
                  <LineChart width={650} height={250} data={trendData} margin={{ left: -20 }}>
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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Classes de gravité</h2>
              <p className="text-xs text-slate-500">Répartition après classification</p>
              <div className="mt-3 overflow-x-auto">
                {severityData.length > 0 ? (
                  <BarChart width={2200} height={250} data={severityData} margin={{ left: 400, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 40]} />
                    <Tooltip />
                    <Bar dataKey="count" name="Signalements" minPointSize={0} barSize={550}>
                      {severityData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Zones dégradées (clustering DBSCAN)
                </h2>
                <p className="text-xs text-slate-500">
                  Regroupement des signalements proches géographiquement.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    Rayon (km)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={epsKm}
                    onChange={(event) => setEpsKm(Number(event.target.value) || 0.5)}
                    className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    Min. points
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={minSamples}
                    onChange={(event) => setMinSamples(Number(event.target.value) || 2)}
                    className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadClusters()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${clustersLoading ? "animate-spin" : ""}`} />
                  Recalculer
                </button>
              </div>
            </div>

            {clustersLoading ? (
              <div className="flex h-56 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            ) : clusters ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {clusters.clusterCount} zone(s) détectée(s)
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                    {clusters.noiseCount} signalement(s) isolé(s)
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    Rayon {clusters.epsKm} km · min {clusters.minSamples}
                  </span>
                </div>

                <ClustersMap data={clusters} height={360} />

                {clusters.clusters.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Zone</th>
                          <th className="px-3 py-2 font-semibold">Signalements</th>
                          <th className="px-3 py-2 font-semibold">Gravité moyenne</th>
                          <th className="px-3 py-2 font-semibold">Types principaux</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clusters.clusters.map((cluster, index) => (
                          <tr key={`${cluster.latitude}-${cluster.longitude}-${index}`}>
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {cluster.city ?? cluster.region ?? `Zone ${index + 1}`}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{cluster.count}</td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {cluster.avgSeverity !== null
                                ? `${cluster.avgSeverity.toFixed(0)}/100`
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500">
                              {cluster.damageTypes
                                .map((type) => damageLabels[type])
                                .join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Aucune zone dense détectée avec ces paramètres. Augmentez le rayon ou
                    réduisez le nombre minimum de points.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Synthèse par région</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Région</th>
                    <th className="px-3 py-2 font-semibold">Signalements</th>
                    <th className="px-3 py-2 font-semibold">Gravité moyenne</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summary?.byRegion ?? [])
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((region) => (
                      <tr key={region.region}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {region.region}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{region.count}</td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {region.avgSeverity !== null
                            ? `${region.avgSeverity.toFixed(0)}/100`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
