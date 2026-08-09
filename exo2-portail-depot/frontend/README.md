# Frontend — Portail de Dépôt de Pièces

Next.js (App Router) + Chakra UI v3 + Tailwind, respectant la charte graphique DIV Protocol.

Voir le [README racine](../README.md) pour l'architecture globale, le modèle de données, l'observabilité et le déploiement. Ce document couvre uniquement le frontend.

---

## Stack

- **Next.js (App Router)**, TypeScript, pas de dossier `src/` — tout part de la racine (`app/`, `components/`, `features/`, `lib/`).
- **Chakra UI v3** — `createSystem`/`defineConfig` (pas l'ancienne API v2 `extendTheme`), theme centralisé dans `theme/system.ts`. Possède tous les composants avec état/interaction (boutons, champs, badges, cartes).
- **Tailwind CSS** — layout de page uniquement (grid, flex, spacing, breakpoints). N'utilise jamais de couleurs/typo Tailwind qui dupliqueraient les tokens Chakra.
- **react-hook-form + zod** pour tous les formulaires.
- **lucide-react** pour les icônes.
- **Client API généré** (`openapi-generator-cli`, générateur `typescript-fetch`) dans `api/generated/` — fetch natif, pas d'Axios, pas de react-query. Régénéré depuis le contrat OpenAPI du backend, jamais écrit à la main.

---

## Démarrage local

```bash
npm install
cp .env.example .env.local   # renseigner NEXT_PUBLIC_API_URL
npm run dev
```

Le client API généré doit être présent dans `api/generated/` — voir [Régénérer le client API](#régénérer-le-client-api) s'il est absent ou périmé par rapport au backend.

---

## Charte graphique DIV Protocol

Tokens exacts (définis dans `theme/system.ts`, jamais de valeur hexadécimale en dur ailleurs dans le code) :

| Token | Valeur |
|---|---|
| `primary` | `#5100FF` |
| `secondary` | `#916ED8` |
| `text` | `#000000` |
| `gray` | `#585858` |
| `grayLight` | `#CECECE` |
| `border` | `#E9E9E9` |
| `accentBg` | `#F7F6FF` |
| `accentSoft` | `#DBCDFF` |
| `success` | `#12AC64` sur `#D9FFED` |
| `danger` | `#FF4C4C` sur `#FFD0D0` |
| `warning` | `#DA9705` sur `#FFEDCA` |
| `info` | `#52A0EE` sur `#DBEDFF` |

Typographie : Inter, 400 pour le corps, 600 pour les titres et les CTA. Radius : 4px, 8px, 12px, et 999px (boutons/badges uniquement). Site en mode clair uniquement, pas de dark mode.

**Le détail qui signe le site** — bouton primaire : fond `primary`, texte blanc, poids 600, padding 24px/14px, radius plein. Au survol, il **s'inverse** : fond `#F7F6FF`, texte `primary`, contour inset 1px `primary`. Implémenté comme variant Chakra `primary` dans `theme/system.ts`, jamais recopié composant par composant.

---

## Structure du projet

```
api/
  generated/                  # client OpenAPI généré, gitignoré, régénéré à la demande
theme/
  system.ts                   # tous les tokens Chakra, source unique de vérité
components/
  ui/                         # composants "bêtes", réutilisables, jamais d'import depuis features/
    PrimaryButton, StatusBadge, TextField, PinInput, DropZone,
    FileRow, EmptyState, ErrorState, RequestCardSkeleton, FileRowSkeleton
features/
  auth/               {components, hooks, api}
  requests/            {components, hooks, api}   # côté avocat : créer/lister/détail des demandes
  public-deposit/      {components, hooks, api}   # côté anonyme : déverrouillage + dépôt
lib/
  auth-storage.ts               # JWT avocat, persistant
  deposit-session-storage.ts    # JWT de session de dépôt, en mémoire UNIQUEMENT, jamais localStorage
app/
  (auth)/login, (auth)/register
  (lawyer)/layout.tsx            # garde d'authentification, redirige vers /login si JWT absent/invalide
  (lawyer)/dashboard/…
  d/[token]/…                     # page publique, aucune garde
```

**Règle de dépendance** : `components/ui/` n'importe jamais depuis `features/`. `features/` peut importer depuis `components/ui/` et `lib/`. Les pages `app/` composent des éléments de `features/`, sans logique métier propre.

---

## Les deux mondes d'authentification — ne jamais les mélanger

| | JWT avocat | JWT session de dépôt |
|---|---|---|
| Stockage | Persistant (`lib/auth-storage.ts`) | Mémoire React uniquement (`lib/deposit-session-storage.ts`) |
| Durée de vie | ~1 jour | ~30 minutes |
| Obtenu via | `POST /auth/login` | `POST /public/unlock` |
| Utilisé sur | `(lawyer)/*` | `d/[token]` après déverrouillage |

Chaque monde a son propre wrapper de client API, injectant le bon token. Le token public de l'URL (`d/[token]`) n'est **jamais** réutilisé après le déverrouillage — toute la session repose ensuite sur le JWT de session de dépôt.

---

## Garde de routes

- Avocat déjà connecté qui tente `/login` ou `/register` → redirigé vers `/dashboard`.
- Visiteur non connecté qui tente `/dashboard/*` → redirigé vers `/login`.
- `d/[token]` reste toujours ouvert, sans garde — c'est la route publique du produit.

La vérification du JWT étant faite côté client (lecture depuis le storage), les gardes gèrent un bref état de chargement avant redirection plutôt qu'un contrôle serveur — accepté pour ce périmètre, pas de contenu sensible exposé pendant ce court instant.

---

## Conventions Next.js utilisées

- `loading.tsx` : affiche un squelette dont la forme correspond au contenu réel (`RequestCardSkeleton`, `FileRowSkeleton`), jamais un simple spinner générique — sauf pour le contrôle initial du lien public (`d/[token]/loading.tsx`), où un spinner bref suffit.
- `error.tsx` : Client Component, reçoit `{ error, reset }`, affiche le composant `ErrorState` avec `reset` câblé comme action de réessai.
- `not-found.tsx` : affiche `EmptyState`, jamais de jargon "404" exposé à l'utilisateur.

---

## Régénérer le client API

À relancer après toute modification de DTO/contrôleur côté backend :

```bash
# 1. Depuis backend/, génère le contrat OpenAPI
npm run build   # nest build seul, ne fait AUCUN appel réseau/DB
npm run swagger:export

# 2. Depuis frontend/, régénère le client à partir du contrat
npm run api:generate
```

Le client généré (`api/generated/`) est committé dans le repo pour garder le build Docker reproductible sans dépendance à Java/`openapi-generator-cli` dans l'image finale.

---

## Couverture d'états

Tout écran alimenté par des données gère explicitement ses quatre états : chargement, vide, erreur, peuplé. Le cas nominal seul n'est jamais suffisant — en particulier pour `FileRow`, qui doit refléter les trois états réels d'un dépôt (succès, en cours avec pourcentage, échoué avec action de réessai), et pour le formulaire de dépôt public, qui doit distinguer lien introuvable, lien expiré, et PIN incorrect.

---

## Responsive

Testé et utilisable à 375px, pas seulement "non cassé" : le `PinInput` (6 chiffres) ne déborde jamais, les cartes de demande empilent leurs métadonnées verticalement plutôt qu'un débordement horizontal, la zone de dépôt reste cliquable, les boutons gardent une hauteur tactile minimale (~44px) sur mobile.

---

## Build & déploiement

Voir le [README racine](../README.md#choix-darchitecture-justifiés) pour la logique complète — en résumé : l'image est construite via `frontend/Dockerfile` (multi-stage, `output: 'standalone'` requis dans `next.config.js`), publiée sur GHCR, jamais buildée sur le serveur de déploiement.

`NEXT_PUBLIC_API_URL` est une variable de **build**, injectée via `--build-arg` — elle est figée dans le bundle client au moment du build de l'image, pas lue au runtime du conteneur.