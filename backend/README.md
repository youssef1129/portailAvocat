# Backend — Portail de Dépôt de Pièces

NestJS + TypeORM + PostgreSQL, stockage objet MinIO (S3-compatible), observabilité Prometheus.

Voir le [README racine](../README.md) pour l'architecture globale, le modèle de données complet, le périmètre d'observabilité et le déploiement. Ce document couvre uniquement le backend.

---

## Stack

- **NestJS**, TypeScript.
- **TypeORM** + PostgreSQL, migrations versionnées (`synchronize: false` — jamais de sync automatique du schéma, même en dev).
- **@nestjs/jwt** + **@nestjs/passport** — deux stratégies JWT distinctes et isolées (voir [Les deux mondes d'authentification](#les-deux-mondes-dauthentification)).
- **bcrypt** pour les mots de passe avocat et les PIN de dépôt.
- **@aws-sdk/client-s3** + **@aws-sdk/s3-request-presigner** contre MinIO (API S3-compatible) — upload interne et génération d'URLs pré-signées pour le téléchargement.
- **@nestjs/throttler** — rate limiting IP sur les routes publiques sensibles.
- **prom-client** — métriques custom exposées sur `/metrics`.
- **@nestjs/swagger** — documentation OpenAPI générée depuis les décorateurs, servie sur `/api` et exportée en JSON pour la génération du client frontend.
- **Jest** — tests unitaires sur la logique métier.

---

## Démarrage local

```bash
npm install
cp .env.example .env
docker compose up -d db minio   # dépendances seules, pas besoin de tout lancer pour dev

npm run migration:run
npm run seed
npm run start:dev
```

---

## Structure des modules

```
src/
├── auth/          # Lawyer entity, login, JwtStrategy (avocat), JwtAuthGuard
├── requests/       # DepositRequest/DepositedFile entities, CRUD côté avocat
├── public/         # unlock, deposit-session JWT strategy + guard, upload/listing public
├── storage/        # StorageService — client S3/MinIO, upload + URLs pré-signées
├── metrics/         # MetricsService (prom-client) + endpoint /metrics
└── database/        # DataSource TypeORM, migrations, script de seed
```

**Pourquoi `storage/` est un module séparé** plutôt qu'intégré dans `public/` : `requests/` a aussi besoin de générer des URLs pré-signées (téléchargement côté avocat), sans dépendre de tout `public/`. Un `StorageModule` exporté et importé par les deux évite la duplication de logique de connexion S3.

**Pourquoi `metrics/` est un module séparé** : injecté à la fois par `storage/` (compteurs d'upload) et `public/` (compteur de PIN échoués) — un point central évite de dupliquer la config `prom-client`/`Registry`.

---

## Les deux mondes d'authentification

Le point de sécurité le plus important du backend — jamais mélangé, testé explicitement dans les deux sens.

| | Avocat | Session de dépôt |
|---|---|---|
| Payload | `{ sub: lawyerId, email }` | `{ sub: requestId }` |
| Secret | `JWT_SECRET` | `DEPOSIT_SESSION_SECRET` (différent, obligatoire) |
| Durée | `JWT_EXPIRES_IN` (~1j) | `DEPOSIT_SESSION_EXPIRES_IN` (~30min) |
| Stratégie Passport | `jwt` | `deposit-session` (nom distinct) |
| Guard | `JwtAuthGuard` | `DepositSessionGuard` |
| Obtenu via | `POST /auth/login` | `POST /public/unlock` |

Un token signé avec l'un des deux secrets est rejeté par la stratégie de l'autre — vérifié par test (`jwt.strategy.spec.ts`, `deposit-session.strategy.spec.ts`).

---

## Flux de dépôt public

1. `POST /requests` (avocat, authentifié) → génère un `publicToken` (aléatoire, `crypto.randomBytes`) et un PIN à 6 chiffres (`crypto.randomInt(100000, 1000000)` — jamais `Math.random`). Le PIN est renvoyé **une seule fois**, puis uniquement stocké haché (bcrypt).
2. `POST /public/unlock` — body `{ token, pin }`, **jamais dans l'URL**. Vérifie l'existence du token, l'expiration, puis le PIN. Renvoie un `depositSessionToken` en cas de succès.
3. `POST /public/files` / `GET /public/files` — protégés par `DepositSessionGuard`, aucun identifiant dans l'URL : la demande ciblée est déduite du `sub` encodé dans le token.

### Statut calculé, jamais stocké

`computeStatus()` (dans `RequestsService`, réutilisé sans duplication par `PublicService`) :
```
expiresAt < maintenant           → EXPIRED   (l'expiration l'emporte toujours)
sinon, au moins un fichier        → COMPLETE
sinon                              → PENDING
```
Évite un job périodique dont le seul rôle serait de maintenir une colonne de statut synchronisée.

### Protection contre le brute-force

- **Rate limiting IP** (`@nestjs/throttler`) sur `POST /public/unlock` : 5 tentatives / 60s par IP.
- **Lockout par token** (indépendant de l'IP) : 5 échecs sur une fenêtre glissante de 15 minutes verrouillent le lien ciblé. Implémenté en mémoire (`Map` dans `PublicService`) — limitation connue documentée dans le README racine.
- Le message renvoyé en cas de token inconnu, PIN incorrect, ou lien verrouillé est **strictement identique** dans les trois cas — aucun signal distinctif exposé à un attaquant.

---

## Stockage — MinIO

`StorageService` maintient **deux clients S3 distincts** :
- `client` (interne) — utilisé pour l'upload, pointe vers `minio:9000` (hostname Docker interne).
- `publicClient` (public) — utilisé uniquement pour signer les URLs de téléchargement, pointe vers `MINIO_PUBLIC_URL` (le domaine public, routé par nginx). Nécessaire car une URL S3 pré-signée intègre l'endpoint dans le calcul cryptographique de la signature — signer avec l'endpoint interne produirait une URL inutilisable par le navigateur du client final, et tenter de la réécrire en aval (nginx `rewrite`) invaliderait la signature. La route nginx correspondante ne fait donc **aucune réécriture de path**, garantissant que le path signé et le path reçu par MinIO sont strictement identiques.

Le bucket est créé automatiquement au démarrage (`onModuleInit` → `HeadBucketCommand` puis `CreateBucketCommand` si absent) — aucune étape manuelle requise, cohérent avec l'exigence `install.sh` one-click.

---

## Migrations & seed

```bash
npm run migration:generate src/database/migrations/NomDeLaMigration   # après modif d'entité
npm run migration:run                                                   # dev, via ts-node
npm run migration:run:prod                                              # prod, JS compilé, pas de dépendance à ts-node
npm run seed                                                             # dev
npm run seed:prod                                                       # prod, JS compilé
```

Le script de seed **vide entièrement les tables concernées** (`TRUNCATE ... CASCADE` en une seule requête — `TRUNCATE` refuse de vider une table référencée par une FK sinon, même si la table enfant est vide) avant de recréer les données de démo, dans une transaction complète (rollback si une étape échoue à mi-chemin). Relançable sans erreur, mais toute donnée créée entre deux exécutions est perdue — voir les limites connues du README racine.

---

## Observabilité

`MetricsService` centralise un `Registry` `prom-client` et quatre métriques custom :

```
storage_upload_successes_total
storage_upload_failures_total
pin_verification_failures_total
http_requests_total{method, route, status_code}   # peuplé automatiquement par un interceptor global
```

`GET /metrics` est exclu du préfixe global `/api/v1`, non protégé par le `JwtAuthGuard` (Prometheus doit pouvoir le scraper directement), mais **jamais routé publiquement par nginx** — accessible uniquement depuis le réseau Docker interne.

Justification du choix de ces métriques précises et des seuils d'alerte : voir le [README racine](../README.md#périmètre-dobservabilité).

---

## Tests

```bash
npm run test        # suite complète
npm run test:cov     # avec couverture
```

Voir le détail de ce qui est couvert (et pourquoi) dans le [README racine](../README.md#stratégie-de-tests). En résumé : logique de statut, isolation entre avocats, ordre de vérification dans `unlock()` (expiration avant PIN, pour ne jamais calculer un hash bcrypt inutile), lockout réel (pas juste un compteur), et isolation stricte entre les deux mondes JWT.

Convention de mock à respecter dans les nouveaux tests : chaque dépendance injectée est fournie via `useValue` avec un objet mock complet correspondant à l'interface réellement utilisée par le service — jamais `useValue: LaClasseElleMême` (fournir la classe au lieu d'une instance mockée produit un `TypeError` silencieux au runtime du test, pas une erreur de compilation).

---

## Build & déploiement

```bash
npm run build        # nest build seul — ne fait AUCUN appel réseau/DB, safe pour un Dockerfile
npm run swagger:export  # séparé de build : instancie l'AppModule complet, nécessite la DB up
```

Ces deux étapes sont **volontairement découplées** : le Dockerfile n'appelle que `build`, jamais `swagger:export` — ce dernier a besoin d'une connexion DB active, indisponible pendant un `docker build`.

Voir le [README racine](../README.md#choix-darchitecture-justifiés) pour la stratégie complète de build/publication/déploiement (images GHCR, jamais de build sur le serveur).