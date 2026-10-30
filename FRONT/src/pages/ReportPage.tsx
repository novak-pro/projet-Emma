import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import imageCompression from "browser-image-compression";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { LocationMap, type Position } from "../components/LocationMap";
import { api } from "../lib/api";
import { damageLabels } from "../lib/format";
import type { DamageType } from "../lib/types";

const defaultDamageOptions = Object.keys(damageLabels) as DamageType[];

const initialForm = {
  damageType: "NID_DE_POULE" as DamageType,
  sizeEstimate: "",
  roadName: "",
  description: "",
  reporterName: "",
  reporterPhone: "",
};

export function ReportPage() {
  const [position, setPosition] = useState<Position>({ lat: 3.848, lng: 11.502 });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "success" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");

  const [form, setForm] = useState(initialForm);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ displayName: string; latitude: number; longitude: number }>
  >([]);

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<any>({
    damageTypes: defaultDamageOptions.map((v) => ({ value: v, label: damageLabels[v], enabled: true })),
    requirePhotos: false,
    requireDescription: true,
    minDescriptionLength: 10,
    fields: [
      { key: "reporterName", label: "Votre nom", type: "text", required: false, enabled: true },
      { key: "reporterPhone", label: "Téléphone", type: "tel", required: false, enabled: true },
      { key: "sizeEstimate", label: "Taille approximative (m²)", type: "number", required: false, enabled: true },
      { key: "roadName", label: "Route / axe concerné", type: "text", required: false, enabled: true },
    ],
    instructions: "",
  });

  useEffect(() => {
    api
      .getFormConfigPublic()
      .then((data) => setFormConfig(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReverseLoading(true);
    const timer = window.setTimeout(() => {
      api
        .reverseGeocode(position.lat, position.lng)
        .then((result) => {
          if (cancelled) return;
          setAddressLabel(result.displayName);
          setRegion(result.region);
          setCity(result.city);
          setForm((current) =>
            current.roadName ? current : { ...current, roadName: result.road },
          );
        })
        .catch(() => {
          if (!cancelled) setAddressLabel("");
        })
        .finally(() => {
          if (!cancelled) setReverseLoading(false);
        });
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [position.lat, position.lng]);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoMessage("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoStatus("locating");
    setGeoMessage("");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setAccuracy(result.coords.accuracy);
        setGeoStatus("success");
      },
      (err) => {
        setGeoStatus("error");
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? "Accès à la position refusé. Placez le marqueur manuellement sur la carte."
            : "Position introuvable. Placez le marqueur manuellement sur la carte.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (searchQuery.trim().length < 3) return;
    setSearching(true);
    setError("");
    try {
      setSearchResults(await api.searchPlaces(searchQuery.trim()));
    } catch {
      setError("Recherche indisponible pour le moment. Placez le marqueur sur la carte.");
    } finally {
      setSearching(false);
    }
  }

  function selectResult(result: { latitude: number; longitude: number }) {
    setPosition({ lat: result.latitude, lng: result.longitude });
    setSearchResults([]);
    setSearchQuery("");
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    event.target.value = "";
    if (files.length === 0) return;
    setCompressing(true);
    setError("");
    try {
      const compressed = await Promise.all(
        files.slice(0, 5).map((file) =>
          imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true }),
        ),
      );
      setPhotos((current) => [...current, ...compressed].slice(0, 5));
    } catch {
      setError("Impossible de préparer les photos. Essayez avec une autre image.");
    } finally {
      setCompressing(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const minDesc = formConfig.minDescriptionLength ?? 10;
    if ((formConfig.requireDescription !== false) && form.description.trim().length < minDesc) {
      setError(`Décrivez la dégradation en au moins ${minDesc} caractères.`);
      return;
    }
    if (formConfig.requirePhotos && photos.length === 0) {
      setError("Au moins une photo est obligatoire.");
      return;
    }
    for (const field of formConfig.fields || []) {
      if (field.enabled && field.required) {
        const value = (form as any)[field.key];
        if (value === undefined || value === null || String(value).trim() === "") {
          setError(`Le champ "${field.label}" est obligatoire.`);
          return;
        }
      }
    }

    const data = new FormData();
    data.append("latitude", String(position.lat));
    data.append("longitude", String(position.lng));
    data.append("damageType", form.damageType);
    if (region) data.append("region", region);
    if (city) data.append("city", city);
    (formConfig.fields || []).forEach((field: any) => {
      if (!field.enabled) return;
      const value = (form as any)[field.key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        data.append(field.key, String(value).trim());
      }
    });
    if (formConfig.requireDescription !== false || form.description.trim()) {
      data.append("description", form.description.trim());
    }
    photos.forEach((photo) => data.append("photos", photo, photo.name));

    setSubmitting(true);
    try {
      const response = await api.submitReport(data);
      setSuccessId(response.report.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "L'envoi a échoué. Vérifiez votre connexion puis réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccessId(null);
    setForm(initialForm);
    setPhotos([]);
    setError("");
  }

  if (successId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Signalement envoyé</h1>
            <p className="mt-2 text-sm text-slate-600">
              Merci pour votre contribution. Votre signalement a été transmis à l'administrateur
              et sera analysé.
            </p>
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
              Référence : {successId}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Nouveau signalement
              </button>
              <Link
                to="/"
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Signalement citoyen
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Signalez une dégradation de la route
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Nid-de-poule, fissure, affaissement... Aidez à cartographier l'état des routes du
            Cameroun. Aucun compte n'est nécessaire.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                  1
                </span>
                Localisation du problème
              </h2>
              <button
                type="button"
                onClick={locate}
                disabled={geoStatus === "locating"}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {geoStatus === "locating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                Utiliser ma position
              </button>
            </div>

            <form onSubmit={handleSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher un quartier, une ville, une route..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={searching || searchQuery.trim().length < 3}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chercher"}
              </button>
            </form>

            {searchResults.length > 0 ? (
              <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {searchResults.map((result) => (
                  <li key={`${result.latitude}-${result.longitude}`}>
                    <button
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {result.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4">
              <LocationMap
                position={position}
                onChange={(next) => {
                  setPosition(next);
                  setAccuracy(null);
                }}
                accuracy={accuracy}
                height={340}
              />
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <p className="flex items-start gap-2 text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  {reverseLoading
                    ? "Recherche de l'adresse..."
                    : addressLabel || "Déplacez le marqueur ou utilisez votre position GPS."}
                </span>
              </p>
              {region || city ? (
                <p className="mt-1 pl-6 text-xs text-slate-500">
                  {[city, region].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            {geoStatus === "success" ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Position GPS récupérée. Ajustez le
                marqueur si nécessaire.
              </p>
            ) : null}
            {geoStatus === "error" ? (
              <p className="mt-2 text-xs font-medium text-amber-700">{geoMessage}</p>
            ) : null}

            {(formConfig.fields || [])
              .filter((field: any) => field.enabled && field.key === "roadName")
              .map((field: any) => (
                <div className="mt-4" key={field.key}>
                  <label htmlFor={field.key} className="mb-1.5 block text-sm font-medium text-slate-700">
                    {field.label} {field.required ? <span className="text-red-500">*</span> : null}
                  </label>
                  <input
                    id={field.key}
                    type="text"
                    value={(form as any)[field.key] || ""}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                    placeholder={field.placeholder || "Ex. Nationale N3, avenue Charles de Gaulle..."}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                2
              </span>
              Type de dégradation
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(formConfig.damageTypes || [])
                .filter((item: any) => item.enabled)
                .map((item: any) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm({ ...form, damageType: item.value })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    form.damageType === item.value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {formConfig.instructions ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {formConfig.instructions}
              </div>
            ) : null}

            {(formConfig.fields || [])
              .filter((field: any) => field.enabled && field.key !== "roadName")
              .map((field: any) => (
                <div className="mt-4" key={field.key}>
                  <label htmlFor={field.key} className="mb-1.5 block text-sm font-medium text-slate-700">
                    {field.label} {field.required ? <span className="text-red-500">*</span> : null}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={field.key}
                      rows={3}
                      value={(form as any)[field.key] || ""}
                      onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      placeholder={field.placeholder || ""}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
                      value={(form as any)[field.key] || ""}
                      onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      placeholder={field.placeholder || ""}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
                    />
                  )}
                </div>
              ))}

            <div className="mt-4">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Description {formConfig.requireDescription !== false ? <span className="text-red-500">*</span> : null}
              </label>
              <textarea
                id="description"
                required={formConfig.requireDescription !== false}
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Décrivez le problème : profondeur, étendue, dangerosité, repères à proximité..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {form.description.length}/2000
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                3
              </span>
              Photos et contact
            </h2>

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing || photos.length >= 5}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:bg-emerald-50/40 disabled:opacity-60"
              >
                {compressing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                {compressing
                  ? "Préparation des photos..."
                  : photos.length >= 5
                    ? "5 photos maximum"
                    : "Ajouter des photos (optionnel)"}
              </button>
              <p className="mt-1.5 text-xs text-slate-500">
                Les photos sont compressées sur votre appareil avant l'envoi. 10 Mo maximum par
                photo.
              </p>

              {previews.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {previews.map((url, index) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-xl">
                      <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        aria-label="Supprimer la photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reporterName" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Votre nom (optionnel)
                </label>
                <input
                  id="reporterName"
                  value={form.reporterName}
                  onChange={(event) => setForm({ ...form, reporterName: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="reporterPhone" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Téléphone (optionnel)
                </label>
                <input
                  id="reporterPhone"
                  type="tel"
                  value={form.reporterPhone}
                  onChange={(event) => setForm({ ...form, reporterPhone: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Votre signalement est public et anonyme par défaut. Les informations de contact ne
              sont utilisées que par l'administrateur pour vous recontacter si nécessaire.
            </p>
          </section>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || compressing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {submitting ? "Envoi en cours..." : "Envoyer le signalement"}
          </button>
        </form>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:justify-between">
          <p>ProjetEmma - collecte citoyenne de l'état des routes du Cameroun.</p>
          <p>
            Cartographie{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-700 hover:underline"
            >
              OpenStreetMap
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">ProjetEmma</p>
            <p className="text-[11px] text-slate-500">État des routes · Cameroun</p>
          </div>
        </Link>
        <Link
          to="/login"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Espace admin
        </Link>
      </div>
    </header>
  );
}
