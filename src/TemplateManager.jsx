import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILTIN_TEMPLATE_CATALOG, BUILTIN_TEMPLATE_SOURCES, TEMPLATE_STORAGE_BUCKET } from "./lib/cardTemplates";
import { supabase } from "./lib/supabaseClient";

function assetUrl(assetPath) {
  if (assetPath?.startsWith("builtin:")) {
    return BUILTIN_TEMPLATE_SOURCES[assetPath.slice("builtin:".length)];
  }
  if (!assetPath || !supabase) return "";
  return supabase.storage.from(TEMPLATE_STORAGE_BUCKET).getPublicUrl(assetPath).data.publicUrl;
}

function safeExtension(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowed = new Set(["png", "jpg", "jpeg", "webp"]);
  return allowed.has(extension) ? extension : null;
}

export default function TemplateManager({ membership, onCatalogChanged }) {
  const [templates, setTemplates] = useState([]);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTemplates = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("card_templates")
      .select("id, template_key, label, asset_path, is_active")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (loadError) {
      console.error("Unable to load card templates", loadError);
      setError("Impossible de charger les modèles. Vérifie le schéma Supabase et tes droits.");
      return;
    }
    setTemplates(data ?? []);
    setError("");
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const activeCount = useMemo(() => templates.filter((template) => template.is_active).length, [templates]);

  const restoreMissingBuiltIns = async () => {
    if (!membership.can_publish_layout) {
      setError("Il faut le droit « Publier les changements » pour remettre les couleurs intégrées dans les choix publics.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const { error: seedError } = await supabase
      .from("card_templates")
      .upsert(
        BUILTIN_TEMPLATE_CATALOG.map((template) => ({ ...template, is_active: true })),
        { onConflict: "template_key", ignoreDuplicates: true },
      );
    setBusy(false);
    if (seedError) {
      console.error("Unable to restore missing built-in card templates", seedError);
      setError("Initialisation impossible. Vérifie les permissions de publication dans Supabase.");
      return;
    }
    setMessage("Les modèles intégrés manquants ont été remis dans les choix. Ceux que tu avais retirés restent retirés.");
    await loadTemplates();
    await onCatalogChanged();
  };

  const saveLabel = async (template) => {
    const nextLabel = template.label.trim();
    if (!nextLabel) {
      setError("Le nom du modèle ne peut pas être vide.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const { error: saveError } = await supabase
      .from("card_templates")
      .update({ label: nextLabel })
      .eq("id", template.id);
    setBusy(false);
    if (saveError) {
      console.error("Unable to rename card template", saveError);
      setError("Modification impossible. Les modèles actifs demandent aussi le droit de publication.");
      return;
    }
    setMessage(`Le modèle « ${nextLabel} » a été renommé.`);
    await loadTemplates();
    await onCatalogChanged();
  };

  const toggleActive = async (template) => {
    if (!template.is_active && !membership.can_publish_layout) {
      setError("Il faut le droit « Publier les changements » pour ajouter un modèle aux choix publics.");
      return;
    }
    if (template.is_active && activeCount <= 1) {
      setError("Garde au moins un modèle actif pour que les utilisateurs puissent créer une carte.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const { error: toggleError } = await supabase
      .from("card_templates")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);
    setBusy(false);
    if (toggleError) {
      console.error("Unable to update card template visibility", toggleError);
      setError("Mise à jour impossible. Vérifie le droit de publication et les règles Supabase.");
      return;
    }
    setMessage(template.is_active ? "Le modèle a été retiré des choix proposés." : "Le modèle est maintenant proposé aux utilisateurs.");
    await loadTemplates();
    await onCatalogChanged();
  };

  const deleteTemplate = async (template) => {
    if (template.is_active && activeCount <= 1) {
      setError("Impossible de supprimer le dernier modèle actif. Publie d’abord un autre modèle.");
      return;
    }
    if (template.is_active && !membership.can_publish_layout) {
      setError("Il faut le droit « Publier les changements » pour supprimer un modèle visible par les utilisateurs.");
      return;
    }
    const confirmed = window.confirm(
      `Supprimer définitivement « ${template.label} » ? Cette action ne peut pas être annulée.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    const { data: deleted, error: deleteError } = await supabase
      .from("card_templates")
      .delete()
      .eq("id", template.id)
      .select("id")
      .maybeSingle();
    if (deleteError || !deleted) {
      setBusy(false);
      console.error("Unable to delete card template", deleteError);
      setError("Suppression impossible. Vérifie tes droits d’administration et réessaie.");
      return;
    }

    let storageCleanupFailed = false;
    if (template.asset_path && !template.asset_path.startsWith("builtin:")) {
      const { error: storageError } = await supabase.storage
        .from(TEMPLATE_STORAGE_BUCKET)
        .remove([template.asset_path]);
      if (storageError) {
        storageCleanupFailed = true;
        console.error("Template removed but its storage file could not be deleted", storageError);
      }
    }
    setBusy(false);
    setMessage(storageCleanupFailed
      ? `« ${template.label} » a été supprimé, mais son fichier image n’a pas pu être effacé du stockage.`
      : `« ${template.label} » a été supprimé.`);
    await loadTemplates();
    await onCatalogChanged();
  };

  const uploadTemplate = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setError("Choisis d’abord une image de maquette.");
      return;
    }
    const extension = safeExtension(file);
    if (!extension || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choisis une image PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier doit peser 5 Mo maximum.");
      return;
    }
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setError("Donne un nom à cette maquette.");
      return;
    }
    const templateKey = `custom-${crypto.randomUUID()}`;
    const assetPath = `templates/${templateKey}.${extension}`;
    setBusy(true);
    setError("");
    setMessage("");
    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_STORAGE_BUCKET)
      .upload(assetPath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setBusy(false);
      console.error("Unable to upload card template asset", uploadError);
      setError("Envoi impossible. Le stockage des maquettes doit être configuré dans Supabase.");
      return;
    }
    const { error: rowError } = await supabase.from("card_templates").insert({
      template_key: templateKey,
      label: cleanLabel.slice(0, 80),
      asset_path: assetPath,
      is_active: false,
    });
    if (rowError) {
      await supabase.storage.from(TEMPLATE_STORAGE_BUCKET).remove([assetPath]);
      setBusy(false);
      console.error("Unable to register uploaded card template", rowError);
      setError("La maquette n’a pas pu être ajoutée. Vérifie tes droits et réessaie.");
      return;
    }
    setBusy(false);
    setFile(null);
    setLabel("");
    form.reset();
    setMessage("Maquette ajoutée en brouillon, non visible des utilisateurs. Active-la pour la publier.");
    await loadTemplates();
  };

  return (
    <section className="panel template-manager" aria-labelledby="template-manager-title">
      <div className="panel-heading">
        <div>
          <h2 id="template-manager-title">Modèles et couleurs</h2>
          <p>Renomme les modèles, retire-les des choix publics ou ajoute une nouvelle maquette.</p>
        </div>
        <span aria-hidden="true" className="step-index">{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
      </div>
      {loading ? (
        <p role="status">Chargement des modèles…</p>
      ) : error && templates.length === 0 ? (
        <div>
          <p className="form-message is-error" role="alert">{error}</p>
          <button className="button-secondary" disabled={busy} onClick={() => void loadTemplates()} type="button">
            Réessayer
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div className="template-empty-state">
          <p>Aucun modèle n’a encore été enregistré dans la base. Les couleurs intégrées restent disponibles tant qu’aucun modèle n’est configuré ici.</p>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map((template) => (
            <article className={`template-item${template.is_active ? " is-active" : ""}`} key={template.id}>
              <img alt={`Aperçu : ${template.label}`} src={assetUrl(template.asset_path)} />
              <label className="profile-field" htmlFor={`template-label-${template.id}`}>
                <span>Nom du modèle</span>
                <input
                  disabled={busy || (template.is_active && !membership.can_publish_layout)}
                  id={`template-label-${template.id}`}
                  maxLength={80}
                  onChange={(event) => setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, label: event.target.value } : item))}
                  value={template.label}
                />
              </label>
              <div className="template-item-actions">
                <span className={`template-status${template.is_active ? " is-active" : ""}`}>
                  {template.is_active ? "Visible aux utilisateurs" : "Brouillon"}
                </span>
                <button className="button-secondary" disabled={busy || (template.is_active && !membership.can_publish_layout)} onClick={() => void saveLabel(template)} type="button">
                  Enregistrer le nom
                </button>
                <button className={template.is_active ? "button-secondary" : "button-primary"} disabled={busy} onClick={() => void toggleActive(template)} type="button">
                  {template.is_active ? "Retirer des choix" : "Publier ce modèle"}
                </button>
                <button className="template-delete-button" disabled={busy} onClick={() => void deleteTemplate(template)} type="button">
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="template-restore-row">
        <div>
          <strong>Couleurs intégrées</strong>
          <p>Rétablit uniquement celles qui manquent. Les modèles que tu as retirés restent masqués.</p>
        </div>
        <button className="button-secondary" disabled={busy} onClick={() => void restoreMissingBuiltIns()} type="button">
          {busy ? "Vérification…" : "Rétablir les couleurs intégrées manquantes"}
        </button>
      </div>
      <form className="template-upload-form" onSubmit={uploadTemplate}>
        <div>
          <h3>Ajouter une maquette</h3>
          <p>Image PNG, JPG ou WEBP, 5 Mo maximum. La maquette sera ajoutée comme brouillon.</p>
        </div>
        <label className="profile-field" htmlFor="template-new-label">
          <span>Nom de la maquette</span>
          <input id="template-new-label" maxLength={80} onChange={(event) => setLabel(event.target.value)} value={label} />
        </label>
        <label className="profile-field" htmlFor="template-new-file">
          <span>Fichier image</span>
          <input accept="image/png,image/jpeg,image/webp" id="template-new-file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
        </label>
        <button className="button-primary" disabled={busy} type="submit">
          {busy ? "Envoi…" : "Ajouter en brouillon"}
        </button>
      </form>
      <p className="template-storage-note">L’ajout de fichiers nécessite la configuration du stockage Supabase indiquée dans la documentation du projet. Les fichiers ajoutés restent en brouillon jusqu’à leur publication.</p>
      {message && <p className="form-message is-success" role="status">{message}</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
    </section>
  );
}
