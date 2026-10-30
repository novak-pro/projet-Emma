import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Summary } from "../lib/types";
import { severityColors, severityLabels, statusLabels } from "../lib/format";

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

const url = maptilerKey
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const attribution = maptilerKey
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function ReportsMap({
  points,
  height = 380,
}: {
  points: Summary["recentPoints"];
  height?: number;
}) {
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
        {points.map((point) => {
          const color = point.severityClass
            ? severityColors[point.severityClass]
            : "#64748b";
          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={7}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.65, weight: 2 }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  {point.city ? <p className="font-semibold">{point.city}</p> : null}
                  {point.roadName ? <p>{point.roadName}</p> : null}
                  <p>
                    Gravité :{" "}
                    {point.severityClass ? severityLabels[point.severityClass] : "non analysée"}
                  </p>
                  <p>Statut : {statusLabels[point.status]}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
