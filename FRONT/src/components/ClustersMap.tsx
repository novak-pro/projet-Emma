import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Clusters } from "../lib/types";
import { damageLabels, severityColors, severityLabels } from "../lib/format";

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

const url = maptilerKey
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const attribution = maptilerKey
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function colorFor(avgSeverity: number | null) {
  if (avgSeverity === null) return "#64748b";
  if (avgSeverity >= 75) return severityColors.CRITIQUE;
  if (avgSeverity >= 55) return severityColors.GRAVE;
  if (avgSeverity >= 30) return severityColors.MODEREE;
  return severityColors.LEGERE;
}

export function ClustersMap({ data, height = 380 }: { data: Clusters; height?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer
        center={[5.5, 12.3]}
        zoom={6}
        style={{ height }}
        className="w-full z-0"
        scrollWheelZoom={false}
      >
        <TileLayer url={url} attribution={attribution} />
        {data.clusters.map((cluster, index) => {
          const color = colorFor(cluster.avgSeverity);
          const radius = Math.min(9 + cluster.count * 1.5, 30);
          return (
            <CircleMarker
              key={`${cluster.latitude}-${cluster.longitude}-${index}`}
              center={[cluster.latitude, cluster.longitude]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold">
                    {cluster.city ?? cluster.region ?? `Zone ${index + 1}`}
                  </p>
                  <p>{cluster.count} signalements regroupés</p>
                  <p>
                    Gravité moyenne :{" "}
                    {cluster.avgSeverity !== null ? `${cluster.avgSeverity.toFixed(0)}/100` : "—"}
                  </p>
                  <p>
                    Types : {cluster.damageTypes.map((type) => damageLabels[type]).join(", ")}
                  </p>
                  <p>
                    Classe dominante :{" "}
                    {cluster.avgSeverity !== null
                      ? severityLabels[
                          cluster.avgSeverity >= 75
                            ? "CRITIQUE"
                            : cluster.avgSeverity >= 55
                              ? "GRAVE"
                              : cluster.avgSeverity >= 30
                                ? "MODEREE"
                                : "LEGERE"
                        ]
                      : "non analysée"}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
