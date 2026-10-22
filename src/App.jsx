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

function CreatePage({ profile, setProfile, layout, templateCatalog, user, isGoogleAuthenticated, onSignIn, authReady, memberCardNumber, memberCardLoading, memberCardError, onSaveCard }) {
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
            isGoogleAuthenticated={isGoogleAuthenticated}
            onSignIn={onSignIn}
            onSaveCard={isGoogleAuthenticated ? onSaveCard : undefined}
          />
        </section>
      </div>
    </>
  );
}

function formatCardDate(value) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function getCardExpirationDate(createdAt) {
  return new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
}

function CollectionPage({ cards, loading, error, user, onCreate, onSignIn, onDeleteCard, deletingCardId, actionMessage }) {
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Collection personnelle</p>
        <h1>Mes cartes</h1>
        <p>Retrouve ici les cartes que tu as téléchargées depuis ton compte.</p>
      </header>
      {!user ? (
        <section className="panel empty-state">
          <span aria-hidden="true" className="empty-mark">HA</span>
          <h2>Connecte-toi pour retrouver tes cartes</h2>
          <p>Chaque compte Google possède sa propre collection privée.</p>
          <button className="button-primary" onClick={onSignIn} type="button">Se connecter avec Google</button>
        </section>
      ) : loading ? (
        <section className="panel empty-state" role="status"><p>Chargement de ta collection…</p></section>
      ) : error ? (
        <section className="panel empty-state"><h2>Impossible de charger tes cartes</h2><p className="form-message is-error" role="alert">{error}</p></section>
      ) : cards.length === 0 ? (
        <section className="panel empty-state">
          <span aria-hidden="true" className="empty-mark">HA</span>
          <h2>Ta collection commence ici</h2>
          <p>Les prochaines cartes seront enregistrées automatiquement lorsque tu les téléchargeras en étant connecté.</p>
          <button className="button-primary" onClick={onCreate} type="button">Créer une carte</button>
        </section>
      ) : (
        <>
          {actionMessage && <p className={`form-message ${actionMessage.type === "error" ? "is-error" : "is-success"}`} role="status">{actionMessage.text}</p>}
          <section className="history-grid" aria-label="Historique de tes cartes">
            {cards.map((card) => {
              const expiresAt = getCardExpirationDate(card.created_at);
              const isDeleting = deletingCardId === card.id;
              return (
                <article className="panel history-card" key={card.id}>
                  {card.imageUrl ? <img className="history-card-image" src={card.imageUrl} alt={`Carte Otaku de ${card.title}`} loading="lazy" /> : <div className="history-card-image history-card-image-empty">Aperçu indisponible</div>}
                  <div className="history-card-details">
                    <h2>{card.title}</h2>
                    <time dateTime={card.created_at}>Créée le {formatCardDate(card.created_at)}</time>
                    <p className="history-expiration">Expire le {formatCardDate(expiresAt.toISOString())} <span>(conservation de 30 jours)</span></p>
                    {card.profile_data?.genre && <p>{card.profile_data.genre}</p>}
                    <div className="history-actions">
                      {card.imageUrl && <a className="button-primary history-download" href={card.imageUrl} download={`carte-otaku-${(card.title || "collection").replace(/[^a-z0-9_-]/gi, "-")}.png`}>Télécharger la carte</a>}
                      <button className="history-delete-button" type="button" onClick={() => onDeleteCard(card)} disabled={isDeleting}>
                        {isDeleting ? "Suppression…" : "Supprimer"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
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
 const [inbox,setInbox]=useState(false),[items,setItems]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState("all"),[type,setType]=useState("all"),[page,setPage]=useState(0),[resultCount,setResultCount]=useState(0),[total,setTotal]=useState(0),[counts,setCounts]=useState({pending:0,reviewed:0,accepted:0,rejected:0}),[selected,setSelected]=useState(null),[busyId,setBusyId]=useState(null);
 const pageSize=10;
 const loadCounts=useCallback(async()=>{const f=async(s)=>{let q=supabase.from("suggestions").select("id",{count:"exact",head:true});if(s)q=q.eq("status",s);const{count,error:e}=await q;if(e)throw e;return count??0;};const[a,p,r,c,j]=await Promise.all([f(null),f("pending"),f("reviewed"),f("accepted"),f("rejected")]);setTotal(a);setCounts({pending:p,reviewed:r,accepted:c,rejected:j});},[]);
 const loadItems=useCallback(async()=>{if(!membership.can_read_suggestions)return;setLoading(true);setError("");try{let q=supabase.from("suggestions").select("id,type,title,description,status,created_at",{count:"exact"}).order("created_at",{ascending:false});if(status!=="all")q=q.eq("status",status);if(type!=="all")q=q.eq("type",type);const term=search.trim().replace(/[,%()\\"]/g," ").replace(/\\s+/g," ").trim();if(term)q=q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);const{data,count,error:e}=await q.range(page*pageSize,(page+1)*pageSize-1);if(e)throw e;setItems(data??[]);setResultCount(count??0);}catch(e){console.error(e);setError("Impossible de charger les messages. Vérifie les permissions Supabase et réessaie.");}finally{setLoading(false);}},[membership.can_read_suggestions,status,type,search,page]);
 useEffect(()=>{if(membership.can_read_suggestions)void loadCounts().catch(console.error);},[membership.can_read_suggestions,loadCounts]);
 useEffect(()=>{if(!inbox||!membership.can_read_suggestions)return;const t=window.setTimeout(()=>void loadItems(),180);return()=>window.clearTimeout(t);},[inbox,membership.can_read_suggestions,loadItems]);
 useEffect(()=>{setPage(0);},[search,status,type]);
 const updateStatus=async(id,next)=>{if(!membership.can_write_suggestions)return;setBusyId(id);setError("");setNotice("");const{error:e}=await supabase.from("suggestions").update({status:next}).eq("id",id);setBusyId(null);if(e){console.error(e);setError("La modification du statut a échoué.");return;}setItems(v=>v.map(x=>x.id===id?{...x,status:next}:x));setSelected(v=>v?.id===id?{...v,status:next}:v);setNotice("Statut mis à jour.");void loadCounts().catch(console.error);};
 const removeItem=async(item)=>{if(!membership.can_write_suggestions||!item?.id)return;if(!window.confirm(`Supprimer définitivement « ${item.title} » ? Cette action est irréversible.`))return;setBusyId(item.id);setError("");setNotice("");const{data,error:e}=await supabase.from("suggestions").delete().eq("id",item.id).select("id");setBusyId(null);if(e||!data?.length){console.error(e);setError("Le message n’a pas pu être supprimé. Vérifie les permissions Supabase.");return;}setItems(v=>v.filter(x=>x.id!==item.id));setSelected(v=>v?.id===item.id?null:v);setNotice("Message supprimé définitivement.");try{await Promise.all([loadCounts(),loadItems()]);}catch(e){console.error(e);}};
 const sl=s=>({pending:"À examiner",reviewed:"Examinée",accepted:"Retenue",rejected:"Refusée"}[s]??s),tl=t=>({idea:"Idée",assumption:"Supposition",suggestion:"Suggestion"}[t]??t),dt=d=>new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}),pages=Math.max(1,Math.ceil(resultCount/pageSize));
 return <><header className="page-heading"><p className="eyebrow">Espace réservé</p><h1>Administration</h1><p>Gère les messages reçus et les outils de la guilde depuis cet espace.</p></header>
 {!inbox?<section className="panel admin-inbox-launcher"><div className="admin-inbox-launcher-copy"><p className="eyebrow">Boîte de réception</p><h2>Messages reçus</h2><p>Consulte, recherche, classe et supprime les idées, suggestions et suppositions envoyées depuis « À propos ».</p><div className="admin-inbox-summary"><span><strong>{total}</strong> message{total>1?"s":""}</span><span className={counts.pending?"has-pending":""}><strong>{counts.pending}</strong> à examiner</span></div></div><button className="button-primary admin-inbox-open" disabled={!membership.can_read_suggestions} onClick={()=>setInbox(true)} type="button">Ouvrir les messages reçus</button>{!membership.can_read_suggestions&&<p className="form-message is-error">Ton rôle ne dispose pas de la permission « Lire les suggestions ».</p>}</section>
 :<section className="panel admin-inbox"><div className="admin-inbox-heading"><div><p className="eyebrow">Boîte de réception HUNTERS</p><h2>Messages reçus</h2><p>Les suppressions sont définitives et ne concernent que le message sélectionné.</p></div><button className="button-secondary" onClick={()=>{setInbox(false);setSelected(null);}} type="button">Retour à l’administration</button></div>
 <div className="admin-inbox-stats"><div><span>Total</span><strong>{total}</strong></div><div className="is-pending"><span>À examiner</span><strong>{counts.pending}</strong></div><div><span>Examinées</span><strong>{counts.reviewed}</strong></div><div><span>Retenues</span><strong>{counts.accepted}</strong></div><div><span>Refusées</span><strong>{counts.rejected}</strong></div></div>
 <div className="admin-inbox-filters"><label className="profile-field" htmlFor="suggestion-search"><span>Rechercher dans les messages</span><input id="suggestion-search" type="search" placeholder="Titre ou contenu…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="profile-field" htmlFor="suggestion-status-filter"><span>Statut</span><select id="suggestion-status-filter" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tous les statuts</option><option value="pending">À examiner</option><option value="reviewed">Examinées</option><option value="accepted">Retenues</option><option value="rejected">Refusées</option></select></label><label className="profile-field" htmlFor="suggestion-type-filter"><span>Type</span><select id="suggestion-type-filter" value={type} onChange={e=>setType(e.target.value)}><option value="all">Tous les types</option><option value="idea">Idées</option><option value="suggestion">Suggestions</option><option value="assumption">Suppositions</option></select></label></div>
 {notice&&<p className="form-message is-success" role="status">{notice}</p>}{error&&<p className="form-message is-error" role="alert">{error}</p>}
 {loading?<p className="admin-inbox-empty" role="status">Chargement des messages…</p>:!items.length?<div className="admin-inbox-empty"><h3>Aucun message trouvé</h3><p>{search||status!=="all"||type!=="all"?"Essaie de modifier les filtres.":"Les nouvelles propositions apparaîtront ici."}</p></div>:<>
 <div className="admin-inbox-list">{items.map(x=><article className="admin-inbox-row" key={x.id}><div className="admin-inbox-row-main"><div className="admin-inbox-row-meta"><span className={`suggestion-type type-${x.type}`}>{tl(x.type)}</span><span className={`suggestion-status status-${x.status}`}>{sl(x.status)}</span><time dateTime={x.created_at}>{dt(x.created_at)}</time></div><h3>{x.title}</h3><p>{x.description.length>180?`${x.description.slice(0,180)}…`:x.description}</p></div><div className="admin-inbox-row-actions"><button className="button-secondary" onClick={()=>setSelected(x)} type="button">Lire</button>{membership.can_write_suggestions&&<button className="button-danger" disabled={busyId===x.id} onClick={()=>void removeItem(x)} type="button">{busyId===x.id?"Suppression…":"Supprimer"}</button>}</div></article>)}</div>
 <div className="admin-inbox-pagination"><span>{resultCount?`${page*pageSize+1}–${Math.min((page+1)*pageSize,resultCount)} sur ${resultCount}`:"0 résultat"}</span><div><button className="button-secondary" disabled={page===0||loading} onClick={()=>setPage(v=>Math.max(0,v-1))} type="button">Précédent</button><span>Page {page+1} / {pages}</span><button className="button-secondary" disabled={page+1>=pages||loading} onClick={()=>setPage(v=>v+1)} type="button">Suivant</button></div></div></>}
 </section>}
 {selected&&inbox&&<div className="admin-message-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}><section className="admin-message-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-message-title"><button className="admin-message-close" aria-label="Fermer le message" onClick={()=>setSelected(null)} type="button">×</button><div className="admin-inbox-row-meta"><span className={`suggestion-type type-${selected.type}`}>{tl(selected.type)}</span><span className={`suggestion-status status-${selected.status}`}>{sl(selected.status)}</span><time dateTime={selected.created_at}>{dt(selected.created_at)}</time></div><h2 id="admin-message-title">{selected.title}</h2><p className="admin-message-content">{selected.description}</p><label className="profile-field" htmlFor="selected-suggestion-status"><span>Statut du message</span><select id="selected-suggestion-status" disabled={!membership.can_write_suggestions||busyId===selected.id} value={selected.status} onChange={e=>void updateStatus(selected.id,e.target.value)}><option value="pending">À examiner</option><option value="reviewed">Examinée</option><option value="accepted">Retenue</option><option value="rejected">Refusée</option></select></label><div className="admin-message-actions"><button className="button-secondary" onClick={()=>setSelected(null)} type="button">Fermer</button>{membership.can_write_suggestions&&<button className="button-danger" disabled={busyId===selected.id} onClick={()=>void removeItem(selected)} type="button">Supprimer définitivement</button>}</div></section></div>}
 {membership.can_edit_layout&&<LayoutEditor membership={membership} onPublished={onLayoutPublished} templateCatalog={templateCatalog}/>}
 {membership.can_manage_templates&&<TemplateManager membership={membership} onCatalogChanged={onTemplateCatalogChanged}/>}
 {membership.can_manage_admins&&<AdminUsersPanel/>}</>;
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
  const [cardHistory, setCardHistory] = useState([]);
  const [cardHistoryLoading, setCardHistoryLoading] = useState(false);
  const [cardHistoryError, setCardHistoryError] = useState("");
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [cardHistoryActionMessage, setCardHistoryActionMessage] = useState(null);
  const user = session?.user ?? null;
  const isGoogleAuthenticated = Boolean(user && (
    user.app_metadata?.provider === "google" ||
    user.identities?.some((identity) => identity.provider === "google")
  ));
  const userId = user?.id;
  const showAdmin = Boolean(membership && Object.values(membership).some(Boolean));

  const loadCardHistory = useCallback(async () => {
    if (!supabase || !userId) {
      setCardHistory([]);
      setCardHistoryLoading(false);
      setCardHistoryError("");
      return;
    }
    setCardHistoryLoading(true);
    setCardHistoryError("");
    const { data, error } = await supabase
      .from("card_history")
      .select("id, title, profile_data, image_path, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Unable to load card history", error);
      setCardHistoryError("La collection n’a pas pu être chargée. Réessaie dans un instant.");
      setCardHistoryLoading(false);
      return;
    }
    const rows = data ?? [];
    if (!rows.length) {
      setCardHistory([]);
      setCardHistoryLoading(false);
      return;
    }
    const { data: signedUrls, error: urlError } = await supabase.storage
      .from("card-history")
      .createSignedUrls(rows.map((row) => row.image_path), 3600);
    if (urlError) console.error("Unable to sign card history images", urlError);
    const urlByPath = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
    setCardHistory(rows.map((row) => ({ ...row, imageUrl: urlByPath.get(row.image_path) ?? null })));
    setCardHistoryLoading(false);
  }, [userId]);

  const deleteCardFromHistory = useCallback(async (card) => {
    if (!supabase || !userId || !card?.id || !card?.image_path) return;
    const confirmed = window.confirm(`Supprimer définitivement « ${card.title || "Carte Otaku"} » de Mes cartes ? Cette action est irréversible.`);
    if (!confirmed) return;

    setDeletingCardId(card.id);
    setCardHistoryActionMessage(null);
    const { error: deleteError } = await supabase
      .from("card_history")
      .delete()
      .eq("id", card.id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Unable to delete card history record", deleteError);
      setCardHistoryActionMessage({ type: "error", text: "La carte n’a pas pu être supprimée. Réessaie dans un instant." });
      setDeletingCardId(null);
      return;
    }

    setCardHistory((current) => current.filter((item) => item.id !== card.id));
    const { error: storageError } = await supabase.storage.from("card-history").remove([card.image_path]);
    if (storageError) {
      console.error("Card history record deleted, but image cleanup failed", storageError);
      setCardHistoryActionMessage({ type: "error", text: "La carte a été retirée de ton historique, mais son image n’a pas pu être supprimée du stockage. Réessaie plus tard." });
    } else {
      setCardHistoryActionMessage({ type: "success", text: "Carte supprimée de ton historique et de son stockage." });
    }
    setDeletingCardId(null);
  }, [userId]);

  const saveCardToHistory = useCallback(async ({ blob, profile: cardProfile, layout: cardLayout, templateKey }) => {
    if (!supabase || !isGoogleAuthenticated || !userId || !(blob instanceof Blob)) {
      return { ok: false, message: "Connecte-toi avec Google pour enregistrer cette carte dans Mes cartes." };
    }
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("card-history")
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error("Card history image upload failed", uploadError);
      return { ok: false, message: "La carte a été téléchargée, mais son enregistrement dans Mes cartes a échoué." };
    }
    const title = String(cardProfile?.username || cardProfile?.realName || "Carte Otaku").trim().slice(0, 120) || "Carte Otaku";
    const profileData = { ...cardProfile, templateKey: templateKey || cardProfile?.color || "blue" };
    const { error: insertError } = await supabase.from("card_history").insert({
      user_id: userId,
      title,
      profile_data: profileData,
      layout_data: cardLayout ?? null,
      image_path: path,
    });
    if (insertError) {
      console.error("Card history record insert failed", insertError);
      await supabase.storage.from("card-history").remove([path]);
      return { ok: false, message: "La carte a été téléchargée, mais son enregistrement dans Mes cartes a échoué." };
    }
    await loadCardHistory();
    return { ok: true, message: "Carte enregistrée dans Mes cartes." };
  }, [isGoogleAuthenticated, userId, loadCardHistory]);

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
    void loadCardHistory();
  }, [loadCardHistory]);

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
      {showCardIdea && <CardEnhancementIdea onClose={() => setShowCardIdea(false)} />}

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
              isGoogleAuthenticated={isGoogleAuthenticated}
              onSignIn={signInWithGoogle}
              authReady={authReady}
              memberCardNumber={memberCardNumber}
              memberCardLoading={memberCardLoading}
              memberCardError={memberCardError}
              onSaveCard={saveCardToHistory}
            />
          )}
          {activePage === "collection" && (
            <CollectionPage
              cards={cardHistory}
              loading={cardHistoryLoading}
              error={cardHistoryError}
              user={user}
              onCreate={() => setActivePage("create")}
              onSignIn={signInWithGoogle}
              onDeleteCard={deleteCardFromHistory}
              deletingCardId={deletingCardId}
              actionMessage={cardHistoryActionMessage}
            />
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

