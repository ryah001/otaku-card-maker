import { useEffect, useState } from "react";
import OtakuCard from "./OtakuCard";
import { INITIAL_LAYOUT, normalizeCardLayout } from "./lib/cardLayout";
import { supabase } from "./lib/supabaseClient";

const CARD_WIDTH = 957;
const CARD_HEIGHT = 536;
const layoutLabels = {
  photo: "Photo",
  qr: "QR code WhatsApp",
  cardId: "Identifiant de carte",
  labelUsername: "Libellé : nom d’utilisateur",
  valUsername: "Valeur : nom d’utilisateur",
  labelRealName: "Libellé : nom réel",
  valRealName: "Valeur : nom réel",
  labelNationality: "Libellé : nationalité",
  valNationality: "Valeur : nationalité",
  labelStatus: "Libellé : statut",
  valStatus: "Valeur : statut",
  labelGenre: "Libellé : genre préféré",
  valGenre: "Valeur : genre préféré",
  labelQuote: "Libellé : citation",
  valQuote1: "Citation — ligne 1",
  valQuote2: "Citation — ligne 2",
};

const previewProfile = {
  username: "ryah",
  realName: "Crist",
  nationality: "Congolaise",
  status: "Otaku",
  genre: "Shojo",
  quote1: "La réalité est un autre monde pour l’otaku.",
  quote2: "La chasse est ouverte.",
  color: "blue",
  cardNumber: "HUNTER 000001",
};

export default function LayoutEditor({ membership, onPublished, templateCatalog }) {
  const [layout, setLayout] = useState(INITIAL_LAYOUT);
  const [selectedKey, setSelectedKey] = useState("valGenre");
  const [draftId, setDraftId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = layout[selectedKey] ?? INITIAL_LAYOUT.valGenre;

  useEffect(() => {
    let active = true;
    const loadLayout = async () => {
      const { data, error: loadError } = await supabase
        .from("layout_versions")
        .select("id, layout_json, state, version")
        .in("state", ["draft", "published"])
        .order("version", { ascending: false })
        .limit(20);
      if (!active) return;
      setLoading(false);
      if (loadError) {
        console.error("Unable to load card layout", loadError);
        setError("Impossible de charger la mise en page. Vérifie le schéma Supabase et les permissions.");
        return;
      }
      const rows = data ?? [];
      const latestDraft = rows.find((row) => row.state === "draft");
      const latestPublished = rows.find((row) => row.state === "published");
      const preferred = latestDraft ?? latestPublished;
      if (preferred?.layout_json) {
        setLayout(normalizeCardLayout(preferred.layout_json));
        if (latestDraft) setDraftId(latestDraft.id);
      }
    };
    void loadLayout();
    return () => { active = false; };
  }, []);

  const updateDimension = (dimension, rawValue) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    setLayout((current) => {
      const area = { ...current[selectedKey] };
      if (dimension === "x") {
        area.x = Math.min(CARD_WIDTH - area.w, Math.max(0, value));
      } else if (dimension === "y") {
        area.y = Math.min(CARD_HEIGHT - area.h, Math.max(0, value));
      } else if (dimension === "w") {
        area.w = Math.min(CARD_WIDTH - area.x, Math.max(1, value));
      } else {
        area.h = Math.min(CARD_HEIGHT - area.y, Math.max(1, value));
      }
      return { ...current, [selectedKey]: area };
    });
    setMessage("");
  };

  const saveDraft = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    const normalizedLayout = normalizeCardLayout(layout);
    let result;
    if (draftId) {
      result = await supabase
        .from("layout_versions")
        .update({ layout_json: normalizedLayout })
        .eq("id", draftId)
        .select("id")
        .maybeSingle();
    } else {
      result = await supabase
        .from("layout_versions")
        .insert({ layout_json: normalizedLayout, state: "draft" })
        .select("id")
        .single();
    }
    setBusy(false);
    if (result.error || !result.data?.id) {
      console.error("Unable to save card layout draft", result.error);
      setError("Enregistrement du brouillon impossible. Vérifie tes droits d’édition dans Supabase.");
      return null;
    }
    setDraftId(result.data.id);
    setLayout(normalizedLayout);
    setMessage("Brouillon enregistré. Il n’est pas encore visible par les utilisateurs.");
    return result.data.id;
  };

  const publishLayout = async () => {
    if (!membership.can_publish_layout) return;
    const id = await saveDraft();
    if (!id) return;
    setBusy(true);
    setError("");
    setMessage("");
    const publishedAt = new Date().toISOString();
    const { error: publishError } = await supabase
      .from("layout_versions")
      .update({ state: "published", published_at: publishedAt })
      .eq("id", id);
    setBusy(false);
    if (publishError) {
      console.error("Unable to publish card layout", publishError);
      setError("Publication impossible. Vérifie le droit « Publier les changements ».");
      return;
    }
    const publishedLayout = normalizeCardLayout(layout);
    setDraftId(null);
    setMessage("Mise en page publiée pour les utilisateurs.");
    onPublished(publishedLayout);
  };

  const resetLayout = () => {
    setLayout(INITIAL_LAYOUT);
    setDraftId(null);
    setMessage("Aperçu réinitialisé. Enregistre-le comme brouillon pour le conserver.");
    setError("");
  };

  return (
    <section className="panel layout-editor" aria-labelledby="layout-editor-title">
      <div className="panel-heading">
        <div>
          <h2 id="layout-editor-title">Éditeur de mise en page</h2>
          <p>Déplace et redimensionne les zones, puis vérifie le rendu avant publication.</p>
        </div>
        <span aria-hidden="true" className="step-index">957 × 536</span>
      </div>
      {loading ? (
        <p role="status">Chargement de la mise en page…</p>
      ) : (
        <div className="layout-editor-grid">
          <div className="layout-editor-preview">
            <OtakuCard profile={previewProfile} layout={layout} templateCatalog={templateCatalog} previewOnly />
          </div>
          <div className="layout-editor-controls">
            <label className="profile-field" htmlFor="layout-area-select">
              <span>Zone à modifier</span>
              <select id="layout-area-select" onChange={(event) => setSelectedKey(event.target.value)} value={selectedKey}>
                {Object.entries(layoutLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <p className="layout-editor-help">Les mesures sont en pixels sur la carte originale.</p>
            <div className="layout-dimension-grid">
              {[
                ["x", "Position horizontale", CARD_WIDTH - selected.w],
                ["y", "Position verticale", CARD_HEIGHT - selected.h],
                ["w", "Largeur", CARD_WIDTH - selected.x],
                ["h", "Hauteur", CARD_HEIGHT - selected.y],
              ].map(([dimension, label, max]) => (
                <label className="profile-field" htmlFor={`layout-${dimension}`} key={dimension}>
                  <span>{label}</span>
                  <input
                    id={`layout-${dimension}`}
                    max={max}
                    min={dimension === "w" || dimension === "h" ? 1 : 0}
                    onChange={(event) => updateDimension(dimension, event.target.value)}
                    type="number"
                    value={selected[dimension]}
                  />
                </label>
              ))}
            </div>
            <div className="layout-editor-actions">
              <button className="button-secondary" disabled={busy} onClick={resetLayout} type="button">Réinitialiser</button>
              <button className="button-secondary" disabled={busy} onClick={() => void saveDraft()} type="button">Enregistrer le brouillon</button>
              {membership.can_publish_layout && (
                <button className="button-primary" disabled={busy} onClick={() => void publishLayout()} type="button">
                  {busy ? "Enregistrement…" : "Publier pour tous"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {!membership.can_publish_layout && <p className="layout-editor-help">Ton rôle permet de modifier les brouillons, mais pas de les publier.</p>}
      {message && <p className="form-message is-success" role="status">{message}</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
    </section>
  );
}
