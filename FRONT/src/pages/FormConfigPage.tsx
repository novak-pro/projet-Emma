import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { api } from "../lib/api";

const defaultDamage = [
  { value: "NID_DE_POULE", label: "Nid-de-poule", enabled: true },
  { value: "FISSURE", label: "Fissure", enabled: true },
  { value: "AFFAISSEMENT", label: "Affaissement", enabled: true },
  { value: "ORNIERE", label: "Ornière", enabled: true },
  { value: "EROSION", label: "Érosion", enabled: true },
  { value: "AUTRE", label: "Autre", enabled: true },
];

const defaultFields = [
  { key: "reporterName", label: "Votre nom", type: "text", required: false, enabled: true },
  { key: "reporterPhone", label: "Téléphone", type: "tel", required: false, enabled: true },
  { key: "sizeEstimate", label: "Taille approximative (m²)", type: "number", required: false, enabled: true },
  { key: "roadName", label: "Route / axe concerné", type: "text", required: false, enabled: true },
];

export function FormConfigPage() {
  const [config, setConfig] = useState<any>({
    damageTypes: defaultDamage,
    requirePhotos: false,
    requireDescription: true,
    minDescriptionLength: 10,
    fields: defaultFields,
    instructions: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFormConfigAdmin();
      setConfig({
        damageTypes: data.damageTypes ?? defaultDamage,
        requirePhotos: !!data.requirePhotos,
        requireDescription: data.requireDescription !== false,
        minDescriptionLength: data.minDescriptionLength ?? 10,
        fields: data.fields ?? defaultFields,
        instructions: data.instructions ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.updateFormConfig(config);
      setMessage("Configuration enregistrée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!window.confirm("Réinitialiser le formulaire aux valeurs par défaut ?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api.resetFormConfig();
      setConfig({
        damageTypes: data.damageTypes ?? defaultDamage,
        requirePhotos: !!data.requirePhotos,
        requireDescription: data.requireDescription !== false,
        minDescriptionLength: data.minDescriptionLength ?? 10,
        fields: data.fields ?? defaultFields,
        instructions: data.instructions ?? "",
      });
      setMessage("Formulaire réinitialisé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réinitialisation impossible");
    } finally {
      setSaving(false);
    }
  }

  function updateDamage(index: number, key: string, value: any) {
    const next = [...config.damageTypes];
    next[index] = { ...next[index], [key]: value };
    setConfig({ ...config, damageTypes: next });
  }

  function addDamage() {
    setConfig({
      ...config,
      damageTypes: [...config.damageTypes, { value: "AUTRE", label: "Nouveau type", enabled: true }],
    });
  }

  function removeDamage(index: number) {
    setConfig({ ...config, damageTypes: config.damageTypes.filter((_: any, i: number) => i !== index) });
  }

  function updateField(index: number, key: string, value: any) {
    const next = [...config.fields];
    next[index] = { ...next[index], [key]: value };
    setConfig({ ...config, fields: next });
  }

  function addField() {
    setConfig({
      ...config,
      fields: [...config.fields, { key: "custom", label: "Champ personnalisé", type: "text", required: false, enabled: true }],
    });
  }

  function removeField(index: number) {
    setConfig({ ...config, fields: config.fields.filter((_: any, i: number) => i !== index) });
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Formulaire de signalement</h1>
          <p className="mt-1 text-sm text-slate-500">Modifier les questions, types de dégradation et champs du formulaire public.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reset()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Save className="h-4 w-4" /> Enregistrer
          </button>
        </div>
      </div>

      {error ? <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4" />{error}</div> : null}
      {message ? <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4" />{message}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Types de dégradation</h2>
          <p className="text-sm text-slate-500">Choisir les options affichées dans le formulaire public.</p>
        </div>
        <div className="space-y-3 p-5">
          {config.damageTypes.map((item: any, index: number) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
              <input value={item.label} onChange={(e) => updateDamage(index, "label", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={item.value} onChange={(e) => updateDamage(index, "value", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" />
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={item.enabled} onChange={(e) => updateDamage(index, "enabled", e.target.checked)} /> Activé</label>
              <button type="button" onClick={() => removeDamage(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={addDamage} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> Ajouter un type</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Description</h2>
          <p className="text-sm text-slate-500">Paramétrer le champ description.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={config.requireDescription} onChange={(e) => setConfig({ ...config, requireDescription: e.target.checked })} /> Obligatoire</label>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Longueur minimale</label>
            <input type="number" value={config.minDescriptionLength} onChange={(e) => setConfig({ ...config, minDescriptionLength: Number(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Champs supplémentaires</h2>
          <p className="text-sm text-slate-500">Gérer les champs optionnels/obligatoires.</p>
        </div>
        <div className="space-y-3 p-5">
          {config.fields.map((item: any, index: number) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_120px_auto_auto_auto] sm:items-center">
              <input value={item.label} onChange={(e) => updateField(index, "label", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={item.key} onChange={(e) => updateField(index, "key", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono" />
              <select value={item.type} onChange={(e) => updateField(index, "type", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="text">Texte</option>
                <option value="tel">Téléphone</option>
                <option value="number">Nombre</option>
                <option value="textarea">Zone texte</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={item.enabled} onChange={(e) => updateField(index, "enabled", e.target.checked)} /> Activé</label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={item.required} onChange={(e) => updateField(index, "required", e.target.checked)} /> Obligatoire</label>
              <button type="button" onClick={() => removeField(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={addField} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> Ajouter un champ</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Autres paramètres</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={config.requirePhotos} onChange={(e) => setConfig({ ...config, requirePhotos: e.target.checked })} /> Photos obligatoires</label>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-600">Instructions affichées sur le formulaire</label>
            <textarea value={config.instructions} onChange={(e) => setConfig({ ...config, instructions: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
      </section>
    </div>
  );
}
