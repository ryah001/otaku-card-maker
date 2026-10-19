# HUNTERS ANIMES — Otaku Card Maker

Application React/Vite pour créer et télécharger une carte Otaku HUNTERS ANIMES.
Le projet fourni comprend l’aperçu de carte, les modèles de couleur, les pages
Collection et À propos, ainsi que l’authentification et la boîte à idées prévues
avec Supabase.

## Développement

```sh
npm ci
npm run dev
```

Pour activer Google Auth et les suggestions, configure les variables locales
indiquées dans [`.env.example`](.env.example), active Google dans Supabase Auth,
puis applique le schéma décrit dans [`docs/backend-setup.md`](docs/backend-setup.md).
Sans cette configuration, l’application reste en mode aperçu et ne prétend pas
enregistrer de suggestions.

## Vérifications

```sh
npm run build
npm run lint
```

La version publique n’est mise à jour que lors d’une publication distincte.
