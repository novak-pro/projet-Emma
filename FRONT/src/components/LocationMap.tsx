import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "react-leaflet";
import L from "leaflet";
import { Layers, MapPin } from "lucide-react";

export interface Position {
  lat: number;
  lng: number;
}

const maptilerKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

const streetsUrl = maptilerKey
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const streetsAttribution = maptilerKey
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const satelliteUrl = maptilerKey
  ? `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${maptilerKey}`
  : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const satelliteAttribution = maptilerKey
  ? "&copy; MapTiler &copy; OpenStreetMap"
  : "Tiles &copy; Esri";

function ClickHandler({ onPick }: { onPick: (position: Position) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }: { position: Position }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), 13), { animate: true });
  }, [map, position.lat, position.lng]);
  return null;
}

export function LocationMap({
  position,
  onChange,
  accuracy,
  height = 320,
  showSatellite = true,
}: {
  position: Position;
  onChange: (position: Position) => void;
  accuracy?: number | null;
  height?: number;
  showSatellite?: boolean;
}) {
  const [mode, setMode] = useState<"streets" | "satellite">("streets");
  const center = useMemo<LatLngExpression>(
    () => [position.lat, position.lng],
    [position.lat, position.lng],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={13} style={{ height }} className="w-full z-0">
        <TileLayer
          key={mode}
          url={mode === "streets" ? streetsUrl : satelliteUrl}
          attribution={mode === "streets" ? streetsAttribution : satelliteAttribution}
          maxZoom={19}
        />
        <ClickHandler onPick={onChange} />
        <Recenter position={position} />
        <Marker
          draggable
          position={[position.lat, position.lng]}
          eventHandlers={{
            dragend(event) {
              const latlng = (event.target as L.Marker).getLatLng();
              onChange({ lat: latlng.lat, lng: latlng.lng });
            },
          }}
        >
          <Popup>
            Glissez le marqueur pour ajuster l'emplacement exact.
            <br />
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </Popup>
        </Marker>
        {accuracy ? (
          <Circle
            center={[position.lat, position.lng]}
            radius={accuracy}
            pathOptions={{ color: "#0284c7", fillOpacity: 0.08, weight: 1 }}
          />
        ) : null}
      </MapContainer>

      {showSatellite ? (
        <button
          type="button"
          onClick={() => setMode((current) => (current === "streets" ? "satellite" : "streets"))}
          className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
        >
          <Layers className="h-3.5 w-3.5" />
          {mode === "streets" ? "Satellite" : "Plan"}
        </button>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow ring-1 ring-slate-200">
        <MapPin className="h-3 w-3 text-emerald-600" />
        {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
      </div>
    </div>
  );
}
