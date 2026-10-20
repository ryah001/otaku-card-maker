import { useCallback, useEffect, useState } from "react";
import "./App.css";
import OtakuCard from "./OtakuCard";
import LayoutEditor from "./LayoutEditor";
import TemplateManager from "./TemplateManager";
import logo from "./assets/logo.png";
import { socialLinks } from "./data/socialLinks.js";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { BUILTIN_TEMPLATE_CATALOG } from "./lib/cardTemplates.js";

const pageLabels = {
  create: "Créer une carte",
  collection: "Mes cartes",
  about: "À propos",
  admin: "Administration",
};

const initialProfile = {
  username: "",
  realName: "",
  nationality: "",
  status: "",
  genre: "",
  quote1: "",
  quote2: "",
};

const genreGroups = [
  {
    label: "Démographies",
    options: ["Shonen", "Shojo", "Seinen", "Josei", "Kodomomuke"],
  },
  {
    label: "Genres",
    options: [
      "Action",
      "Aventure",
      "Comédie",
      "Drame",
      "Fantastique",
      "Science-fiction",
      "Isekai",
      "Romance",
      "Tranche de vie",
      "Mystère",
      "Thriller",
      "Horreur",
      "Surnaturel",
      "Psychologique",
      "Historique",
      "Sport",
      "Musique",
      "Arts martiaux",
      "Mecha",
      "Magical Girl",
      "Crime",
      "Guerre",
      "Parodie",
      "Voyage dans le temps",
      "Post-apocalyptique",
      "Harem",
      "Reverse Harem",
      "BL / Yaoi",
      "GL / Yuri",
    ],
  },
  { label: "Autre", options: ["Autre"] },
];

function Navigation({ activePage, onNavigate, mobile = false, showAdmin = false }) {
  const pages = Object.entries(pageLabels).filter(
    ([page]) => page !== "admin" || showAdmin,
  );
  return (
    <nav
      className={`${mobile ? "mobile-nav" : "side-nav"}${showAdmin && mobile ? " is-admin" : ""}`}
      aria-label="Navigation principale"
    >
      {pages.map(([page, label]) => (
        <button
          aria-current={activePage === page ? "page" : undefined}
          className={`nav-link${activePage === page ? " is-active" : ""}`}
          key={page}
          onClick={() => onNavigate(page)}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function SocialList({ compact = false }) {
  return (
    <ul className={compact ? "social-list is-compact" : "social-list"}>
      {socialLinks.map((network) => (
        <li key={network.name}>
          <a href={network.url} rel="noreferrer" target="_blank">
            <network.icon
              aria-hidden="true"
              className="social-icon"
              style={{ color: network.color }}
            />
            <span>{network.name}</span>
            {network.isCommunityOnly && (
              <span className="social-note">Communauté</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  multiline = false,
  options,
  placeholder,
  maxLength,
}) {
  if (options) {
    return (
      <label className="profile-field" htmlFor={id}>
        <span>{label}</span>
        <select
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option disabled value="">Choisir un genre…</option>
          {options.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    );
  }

  const Control = multiline ? "textarea" : "input";
  return (
    <label
      className={`profile-field${multiline ? " is-wide" : ""}`}
      htmlFor={id}
    >
      <span>{label}</span>
      <Control
        autoComplete="off"
        id={id}
        maxLength={maxLength ?? (multiline ? 240 : 32)}
        onChange={(event) => onChange(event.target.value)}
        rows={multiline ? 2 : undefined}
        value={value}
        placeholder={placeholder}
      />
    </label>
  );
}

function CreatePage({ profile, setProfile, layout, templateCatalog, user, authReady, memberCardNumber, memberCardLoading, memberCardError }) {
  const updateProfile = (field) => (value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  const selectedColor = templateCatalog.some((template) => template.template_key === profile.color)
    ? profile.color
    : templateCatalog[0]?.template_key ?? "blue";

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Atelier de la guilde</p>
        <h1>Crée ta carte Otaku</h1>
        <p>
          Personnalise ton identité, ajoute ton avatar et télécharge ta carte.
        </p>
      </header>

      <div className="create-layout">
        <section
          aria-labelledby="profile-heading"
          className="panel profile-panel"
        >
          <div className="panel-heading">
            <div>
              <h2 id="profile-heading">Ton profil</h2>
              <p>Les modifications apparaissent directement sur la carte.</p>
            </div>
            <span aria-hidden="true" className="step-index">
              01
            </span>
          </div>
          <div className="profile-form">
            <ProfileField
              id="username"
              label="Nom d’utilisateur"
              placeholder="ryah"
              onChange={updateProfile("username")}
              value={profile.username}
            />
            <ProfileField
              id="real-name"
              label="Nom réel"
              placeholder="Crist"
              onChange={updateProfile("realName")}
              value={profile.realName}
            />
            <ProfileField
              id="nationality"
              label="Nationalité"
              placeholder="Congolaise"
              onChange={updateProfile("nationality")}
              value={profile.nationality}
            />
            <ProfileField
              id="status"
              label="Statut"
              placeholder="Otaku"
              onChange={updateProfile("status")}
              value={profile.status}
            />
            <ProfileField
              id="genre"
              label="Genre préféré"
              options={genreGroups}
              onChange={updateProfile("genre")}
              value={profile.genre}
            />
            <ProfileField
              id="quote1"
              label="Citation ligne 1 (240 caractères max.)"
              multiline
              onChange={updateProfile("quote1")}
              placeholder="La réalité n’est qu’un autre monde pour l’Otaku."
              value={profile.quote1 || ""}
            />
            <ProfileField
              id="quote2"
              label="Citation ligne 2 (240 caractères max.)"
              multiline
              onChange={updateProfile("quote2")}
              placeholder="Ajoute une deuxième citation…"
              value={profile.quote2 || ""}
            />
            {/* Nouveau sélecteur de couleur */}
            <div className="profile-field">
              <span>Couleur de carte</span>
              <select onChange={(event) => setProfile((current) => ({ ...current, color: event.target.value }))} value={selectedColor}>
                {templateCatalog.map((template) => (
                  <option key={template.template_key} value={template.template_key}>{template.label}</option>
                ))}
              </select>
            </div>
            {/* Option QR Code */}
            <label className="flex items-center gap-2 cursor-pointer mt-4">
              <input type="checkbox" checked={profile.hasWhatsappQr} onChange={(e) => setProfile(p => ({...p, hasWhatsappQr: e.target.checked}))} />
              <span>Ajouter mon QR code WhatsApp</span>
            </label>
            {profile.hasWhatsappQr && (
              <ProfileField id="whatsapp" label="Numéro WhatsApp (ex: +242...)" placeholder="+24264851911" onChange={updateProfile("whatsappNumber")} value={profile.whatsappNumber || ''} />
            )}
          </div>
          <div id="profile-photo-picker-slot" />
          <p className="panel-footnote">
            {!authReady
              ? "Vérification de ta connexion Google…"
              : !user
                ? "Connecte-toi avec Google pour obtenir ton ID permanent. Tu peux quand même personnaliser et télécharger ta carte."
                : memberCardLoading
                  ? "Attribution de ton ID permanent…"
                  : memberCardNumber
                    ? `Ton ID permanent : ${memberCardNumber}. Il reste lié à ce compte Google.`
                    : memberCardError || "Ton ID permanent n’a pas pu être chargé."}
            {user && <><br />Les cartes ne sont pas encore enregistrées dans « Mes cartes ».</>}
          </p>
        </section>

        <section
          aria-labelledby="preview-heading"
          className="panel preview-panel"
        >
          <div className="panel-heading preview-heading">
            <div>
              <h2 id="preview-heading">Aperçu de ta carte</h2>
              <p>Le modèle officiel HUNTERS ANIMES est conservé.</p>
            </div>
            <span aria-hidden="true" className="step-index">
              02
            </span>
          </div>
          <OtakuCard
            profile={{ ...profile, cardNumber: memberCardNumber }}
            layout={layout}
            templateCatalog={templateCatalog}
          />
        </section>
      </div>
    </>
  );
}

function CollectionPage({ onCreate }) {
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Collection personnelle</p>
        <h1>Mes cartes</h1>
        <p>
          Tes créations apparaîtront ici après la mise en place de ton espace
          personnel.
        </p>
      </header>
      <section
        aria-labelledby="collection-empty-heading"
        className="panel empty-state"
      >
        <span aria-hidden="true" className="empty-mark">
          HA
        </span>
        <h2 id="collection-empty-heading">Ta collection commence ici</h2>
        <p>
          Les cartes du générateur actuel ne sont pas encore enregistrées en
          ligne.
        </p>
        <button className="button-primary" onClick={onCreate} type="button">
          Créer une carte
        </button>
      </section>
    </>
  );
}

const cardEnhancementPrompt = "Tu es un directeur artistique spécialisé dans les cartes de collection Otaku haut de gamme.\nÀ partir de l'image fournie, crée une version artistiquement améliorée, professionnelle, élégante, spectaculaire et harmonieuse.\nAméliore la lumière, la profondeur, la composition, les contrastes et la qualité visuelle. Adapte l'ambiance au personnage présent sur l'image.\nLe résultat doit être digne d'une carte de collection premium conçue par un graphiste professionnel.\nRespecte autant que possible le personnage, son identité visuelle, les proportions et la composition de la carte.\nÉvite les artefacts, les détails incohérents, les déformations et les éléments visuels excessifs.\nNe crée pas de nouveaux textes.";

function CardEnhancementIdea({ onClose }) {
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(cardEnhancementPrompt);
      setCopyMessage("Le prompt a été copié.");
    } catch {
      setCopyMessage("La copie automatique a échoué. Sélectionne le texte du prompt pour le copier.");
    }
  };

  return (
    <div className="idea-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-labelledby="card-idea-title" aria-modal="true" className="idea-dialog" role="dialog">
        <button aria-label="Fermer" className="idea-dialog-close" onClick={onClose} type="button">×</button>
        <p className="eyebrow">Astuce HUNTERS ANIMES</p>
        <h2 id="card-idea-title">Tu veux booster ta carte ? La rendre encore plus stylée ?</h2>
        <p className="idea-dialog-intro">Voici quoi faire :</p>
        <ol className="idea-dialog-steps">
          <li>Télécharge ta carte.</li>
          <li>Copie le prompt ci-dessous.</li>
          <li>Va sur <a href="https://chatgpt.com/" rel="noreferrer" target="_blank">ChatGPT</a> et envoie ta photo avec ce prompt.</li>
        </ol>
        <pre className="idea-prompt">{cardEnhancementPrompt}</pre>
        <div className="idea-dialog-actions">
          <button className="idea-copy-button" onClick={() => void copyPrompt()} type="button">Copier le prompt</button>
          <a className="idea-chatgpt-link" href="https://chatgpt.com/" rel="noreferrer" target="_blank">Ouvrir ChatGPT</a>
        </div>
        <p aria-live="polite" className="idea-copy-status" role="status">{copyMessage}</p>
      </section>
    </div>
  );
}

function AboutPage({
  user,
  authReady,
  authError,
  signingIn,
  onSignIn,
  onSubmitSuggestion,
}) {
  const [type, setType] = useState("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSubmitState("loading");
    setMessage("");
    const result = await onSubmitSuggestion({ type, title, description });
    setSubmitState(result.ok ? "success" : "error");
    setMessage(result.message);
    if (result.ok) {
      setTitle("");
      setDescription("");
    }
  };

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">La guilde HUNTERS ANIMES</p>
        <h1>La chasse est ouverte</h1>
        <p>
          Un espace pour créer ta carte Otaku, affirmer ton identité et partager
          ta passion.
        </p>
      </header>
      <section className="panel about-panel">
        <h2>Une passion, une communauté</h2>
        <p>
          HUNTERS ANIMES rassemble les passionnés de manga et d’anime autour de
          leurs univers et personnages favoris.
        </p>
        <h2>Retrouve la guilde</h2>
        <p>
          Les liens officiels sont centralisés ici. Telegram et WhatsApp sont
          des espaces communautaires.
        </p>
        <SocialList />
        <h2 id="ideas-heading">Boîte à idées</h2>
        <p>
          Partage une idée, une supposition ou une suggestion avec l’équipe
          HUNTERS ANIMES.
        </p>
        {!isSupabaseConfigured ? (
          <p className="form-message is-error" role="status">
            La connexion Google n’est pas configurée pour ce site. Aucune
            suggestion ne peut être envoyée pour le moment.
          </p>
        ) : !authReady ? (
          <p className="form-message" role="status">Vérification de ta connexion…</p>
        ) : !user ? (
          <div className="idea-auth-prompt">
            <p>Connecte-toi avec Google pour envoyer une proposition.</p>
            <button
              className="button-primary"
              disabled={signingIn}
              onClick={onSignIn}
              type="button"
            >
              {signingIn ? "Connexion…" : "Continuer avec Google"}
            </button>
            {authError && <p className="form-message is-error" role="alert">{authError}</p>}
          </div>
        ) : (
          <form aria-labelledby="ideas-heading" className="idea-form" onSubmit={submit}>
            <p className="idea-signed-in">Connecté en tant que {user.email}</p>
            <label className="profile-field" htmlFor="idea-type">
              <span>Type</span>
              <select id="idea-type" onChange={(event) => setType(event.target.value)} value={type}>
                <option value="suggestion">Suggestion</option>
                <option value="idea">Idée</option>
                <option value="assumption">Supposition</option>
              </select>
            </label>
            <label className="profile-field" htmlFor="idea-title">
              <span>Titre</span>
              <input
                autoComplete="off"
                id="idea-title"
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </label>
            <label className="profile-field" htmlFor="idea-description">
              <span>Description</span>
              <textarea
                id="idea-description"
                maxLength={3000}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={5}
                value={description}
              />
            </label>
            <button className="button-primary" disabled={submitState === "loading"} type="submit">
              {submitState === "loading" ? "Envoi…" : "Envoyer la proposition"}
            </button>
            {message && (
              <p className={`form-message${submitState === "error" ? " is-error" : " is-success"}`} role={submitState === "error" ? "alert" : "status"}>
                {message}
              </p>
            )}
          </form>
        )}
      </section>
    </>
  );
}

const adminPermissionOptions = [
  ["can_read_suggestions", "Lire les suggestions"],
  ["can_write_suggestions", "Modérer les suggestions"],
  ["can_edit_layout", "Modifier les mises en page"],
  ["can_manage_templates", "Gérer les modèles et couleurs"],
  ["can_publish_layout", "Publier les changements"],
  ["can_manage_admins", "Gérer les administrateurs"],
];

function AdminUsersPanel() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState(() =>
    Object.fromEntries(adminPermissionOptions.map(([key]) => [key, false])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAdmins = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc("list_admin_memberships");
    if (loadError) {
      console.error("Unable to load administrator memberships", loadError);
      setError("Impossible de charger les administrateurs. Vérifie que le schéma Supabase est installé.");
      return;
    }
    setAdmins(data ?? []);
    setError("");
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const grant = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const { error: grantError } = await supabase.rpc("grant_admin_by_email", {
      target_email: email.trim(),
      allow_read: permissions.can_read_suggestions,
      allow_write: permissions.can_write_suggestions,
      allow_layout: permissions.can_edit_layout,
      allow_templates: permissions.can_manage_templates,
      allow_publish: permissions.can_publish_layout,
      allow_manage: permissions.can_manage_admins,
    });
    setBusy(false);
    if (grantError) {
      console.error("Unable to grant administrator permissions", grantError);
      setError("Attribution impossible. Vérifie l’adresse Google, les permissions et le schéma Supabase.");
      return;
    }
    setMessage("Les permissions ont été mises à jour.");
    setEmail("");
    await loadAdmins();
  };

  const revoke = async (targetEmail) => {
    setBusy(true);
    setMessage("");
    setError("");
    const { error: revokeError } = await supabase.rpc("revoke_admin_by_email", {
      target_email: targetEmail,
    });
    setBusy(false);
    if (revokeError) {
      console.error("Unable to revoke administrator permissions", revokeError);
      setError("Retrait impossible. Le dernier gestionnaire ne peut pas être supprimé.");
      return;
    }
    setMessage("Les permissions ont été retirées.");
    await loadAdmins();
  };

  return (
    <section className="panel admin-panel" aria-labelledby="admins-heading">
      <h2 id="admins-heading">Administrateurs et permissions</h2>
      <p>Seuls les comptes déjà connectés avec Google peuvent recevoir des droits.</p>
      <form className="admin-grant-form" onSubmit={grant}>
        <label className="profile-field" htmlFor="admin-email">
          <span>Adresse Google du compte</span>
          <input id="admin-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <fieldset className="permission-list">
          <legend>Permissions</legend>
          {adminPermissionOptions.map(([key, label]) => (
            <label key={key}>
              <input
                checked={permissions[key]}
                onChange={(event) => setPermissions((current) => ({ ...current, [key]: event.target.checked }))}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <button className="button-primary" disabled={busy} type="submit">
          Attribuer les permissions
        </button>
      </form>
      {message && <p className="form-message is-success" role="status">{message}</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <div className="admin-list" aria-live="polite">
        {admins.map((admin) => (
          <article className="admin-list-item" key={admin.user_id}>
            <div>
              <strong>{admin.email}</strong>
              <p>{adminPermissionOptions.filter(([key]) => admin[key]).map(([, label]) => label).join(" · ")}</p>
            </div>
            <button className="button-secondary" disabled={busy} onClick={() => void revoke(admin.email)} type="button">
              Retirer les droits
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SuggestionsAdminPage({ membership, onLayoutPublished, onTemplateCatalogChanged, templateCatalog }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(Boolean(membership.can_read_suggestions));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!membership.can_read_suggestions) return;
    let active = true;
    const loadSuggestions = async () => {
      const { data, error: loadError } = await supabase
        .from("suggestions")
        .select("id, type, title, description, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!active) return;
      setLoading(false);
      if (loadError) {
        console.error("Unable to load suggestions", loadError);
        setError("Impossible de charger les propositions. Vérifie que le schéma Supabase est installé.");
        return;
      }
      setSuggestions(data ?? []);
      setError("");
    };
    void loadSuggestions();
    return () => { active = false; };
  }, [membership.can_read_suggestions]);

  const updateStatus = async (id, status) => {
    const { error: updateError } = await supabase
      .from("suggestions")
      .update({ status })
      .eq("id", id);
    if (updateError) {
      console.error("Unable to moderate suggestion", updateError);
      setError("La modération a échoué. Vérifie les permissions Supabase.");
      return;
    }
    setSuggestions((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setError("");
  };

  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Espace réservé</p>
        <h1>Administration</h1>
        <p>Les accès aux données sont vérifiés par les règles Supabase.</p>
      </header>
      <section className="panel admin-panel" aria-labelledby="suggestions-heading">
        <h2 id="suggestions-heading">Suggestions reçues</h2>
        {!membership.can_read_suggestions ? (
          <p>Ton rôle autorise la modération, mais pas la lecture de la liste.</p>
        ) : loading ? (
          <p role="status">Chargement des suggestions…</p>
        ) : error ? (
          <p className="form-message is-error" role="alert">{error}</p>
        ) : suggestions.length === 0 ? (
          <p>Aucune suggestion à examiner pour le moment.</p>
        ) : (
          <div className="suggestion-list">
            {suggestions.map((item) => (
              <article className="suggestion-item" key={item.id}>
                <div className="suggestion-item-heading">
                  <div>
                    <span className="suggestion-type">{item.type === "assumption" ? "Supposition" : item.type === "idea" ? "Idée" : "Suggestion"}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("fr-FR")}</time>
                </div>
                <p>{item.description}</p>
                <label className="profile-field" htmlFor={`suggestion-status-${item.id}`}>
                  <span>État</span>
                  <select
                    disabled={!membership.can_write_suggestions}
                    id={`suggestion-status-${item.id}`}
                    onChange={(event) => void updateStatus(item.id, event.target.value)}
                    value={item.status}
                  >
                    <option value="pending">À examiner</option>
                    <option value="reviewed">Examinée</option>
                    <option value="accepted">Retenue</option>
                    <option value="rejected">Refusée</option>
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}
      </section>
      {membership.can_edit_layout && (
        <LayoutEditor membership={membership} onPublished={onLayoutPublished} templateCatalog={templateCatalog} />
      )}
      {membership.can_manage_templates && (
        <TemplateManager
          membership={membership}
          onCatalogChanged={onTemplateCatalogChanged}
        />
      )}
      {membership.can_manage_admins && <AdminUsersPanel />}
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState("create");
  const [showCardIdea, setShowCardIdea] = useState(false);
  const [profile, setProfile] = useState(initialProfile);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [membership, setMembership] = useState(null);
  const [publishedLayout, setPublishedLayout] = useState(null);
  const [templateCatalog, setTemplateCatalog] = useState(BUILTIN_TEMPLATE_CATALOG);
  const [memberCardNumber, setMemberCardNumber] = useState("");
  const [memberCardLoading, setMemberCardLoading] = useState(false);
  const [memberCardError, setMemberCardError] = useState("");
  const user = session?.user ?? null;
  const userId = user?.id;
  const showAdmin = Boolean(membership && Object.values(membership).some(Boolean));

  const loadTemplateCatalog = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("card_templates")
      .select("id, template_key, label, asset_path")
      .eq("is_active", true)
      .order("label");
    if (error) {
      console.error("Unable to load active card templates", error);
      return;
    }
    setTemplateCatalog(data?.length ? data : BUILTIN_TEMPLATE_CATALOG);
  }, []);

  useEffect(() => {
    void loadTemplateCatalog();
  }, [loadTemplateCatalog]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase
      .from("layout_versions")
      .select("layout_json")
      .eq("state", "published")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Unable to load the published card layout", error);
          return;
        }
        if (data?.layout_json) setPublishedLayout(data.layout_json);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) {
      setMemberCardNumber("");
      setMemberCardLoading(false);
      setMemberCardError("");
      return undefined;
    }

    let active = true;
    setMemberCardNumber("");
    setMemberCardLoading(true);
    setMemberCardError("");
    supabase.rpc("ensure_current_member")
      .then(({ data, error }) => {
        if (!active) return;
        setMemberCardLoading(false);
        if (error || typeof data !== "string" || !data) {
          console.error("Unable to retrieve persistent member card number", error);
          setMemberCardError("Impossible d’attribuer ton ID. La migration Supabase pour les ID permanents doit être exécutée.");
          return;
        }
        setMemberCardNumber(data);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Unable to retrieve persistent member card number", error);
        setMemberCardLoading(false);
        setMemberCardError("La récupération de ton ID a échoué. Vérifie ta connexion et réessaie.");
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError("Impossible de vérifier la connexion.");
      setSession(data?.session ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setMembership(null);
        setActivePage("create");
      }
      setAuthReady(true);
      setAuthError("");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return undefined;
    let active = true;
    supabase
      .from("admin_memberships")
      .select("can_read_suggestions, can_write_suggestions, can_edit_layout, can_manage_templates, can_publish_layout, can_manage_admins")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Unable to check administrator permissions", error);
          setMembership(null);
          return;
        }
        setMembership(data);
      });
    return () => { active = false; };
  }, [userId]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setSigningIn(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setSigningIn(false);
    if (error) {
      console.error("Google sign-in failed", error);
      setAuthError("La connexion Google a échoué. Vérifie le fournisseur OAuth Supabase.");
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign-out failed", error);
      setAuthError("La déconnexion a échoué.");
    }
  };

  const submitSuggestion = async ({ type, title, description }) => {
    if (!supabase || !user) {
      return { ok: false, message: "Connecte-toi avant d’envoyer une suggestion." };
    }
    const { error } = await supabase.from("suggestions").insert({
      user_id: user.id,
      type,
      title: title.trim(),
      description: description.trim(),
    });
    if (error) {
      console.error("Suggestion submission failed", error);
      return {
        ok: false,
        message: "Envoi impossible. Vérifie que le schéma Supabase et l’authentification Google sont configurés. Aucune confirmation d’enregistrement n’a été reçue.",
      };
    }
    return { ok: true, message: "Ta proposition a été enregistrée." };
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          aria-label="HUNTERS ANIMES, accueil"
          className="brand"
          href="#accueil"
          onClick={(event) => {
            event.preventDefault();
            setActivePage("create");
          }}
        >
          <img alt="" className="brand-logo" src={logo} />
          <span className="brand-copy">
            <strong>HUNTERS ANIMES</strong>
            <span>La chasse est ouverte</span>
          </span>
        </a>
        <div className="header-community">
          <SocialList compact />
        </div>
        <div className="account-status" role="status">
          <span aria-hidden="true" className={`account-dot${user ? " is-connected" : ""}`} />
          <span className="account-email">
            {!authReady ? "Vérification…" : user?.email ?? (isSupabaseConfigured ? "Non connecté" : "Mode aperçu")}
          </span>
          {user ? (
            <button className="account-button" onClick={() => void signOut()} type="button">Déconnexion</button>
          ) : (
            <button className="account-button" disabled={!isSupabaseConfigured || signingIn} onClick={() => void signInWithGoogle()} type="button">
              {signingIn ? "Connexion…" : "Connexion Google"}
            </button>
          )}
          {authError && <span className="visually-hidden">{authError}</span>}
        </div>
        <button aria-haspopup="dialog" aria-expanded={showCardIdea} aria-label="Astuce pour améliorer ta carte" className="header-idea-button" onClick={() => setShowCardIdea(true)} type="button">💡</button>
      </header>
      {showCardIdea && <CardEnhancementIdea onClose={() => setShowCardIdea(false)} />

      <div className="app-body">
        <aside className="app-sidebar">
          <p className="sidebar-label">Menu principal</p>
          <Navigation activePage={activePage} onNavigate={setActivePage} showAdmin={showAdmin} />
          <div className="sidebar-community">
            <p className="sidebar-label">Rejoins la guilde</p>
            <SocialList />
          </div>
          <p className="sidebar-footer">© 2026 HUNTERS ANIMES</p>
        </aside>

        <main className="main-content">
          {activePage === "create" && (
            <CreatePage
              layout={publishedLayout}
              profile={profile}
              setProfile={setProfile}
              templateCatalog={templateCatalog}
              user={user}
              authReady={authReady}
              memberCardNumber={memberCardNumber}
              memberCardLoading={memberCardLoading}
              memberCardError={memberCardError}
            />
          )}
          {activePage === "collection" && (
            <CollectionPage onCreate={() => setActivePage("create")} />
          )}
          {activePage === "about" && (
            <AboutPage
              authError={authError}
              authReady={authReady}
              onSignIn={signInWithGoogle}
              onSubmitSuggestion={submitSuggestion}
              signingIn={signingIn}
              user={user}
            />
          )}
          {activePage === "admin" && showAdmin && (
            <SuggestionsAdminPage
              membership={membership}
              onLayoutPublished={setPublishedLayout}
              onTemplateCatalogChanged={loadTemplateCatalog}
              templateCatalog={templateCatalog}
            />
          )}
        </main>
      </div>

      <Navigation activePage={activePage} mobile onNavigate={setActivePage} showAdmin={showAdmin} />
    </div>
  );
}

export default App;
