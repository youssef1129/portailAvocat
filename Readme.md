# Portail de Dépôt de Pièces

Portail sécurisé permettant à un avocat de créer des demandes de dépôt de pièces, protégées par un lien expirable et un code PIN, pour recevoir des documents de ses clients sans échange par email.

**Application déployée : [https://youssef-maazouz.stage2-div.rayan-drissi.com](https://youssef-maazouz.stage2-div.rayan-drissi.com)**
**Dashboard Grafana : [https://youssef-maazouz.stage2-div.rayan-drissi.com/grafana/](https://youssef-maazouz.stage2-div.rayan-drissi.com/grafana/)**
**Documentation API (Swagger) : [https://youssef-maazouz.stage2-div.rayan-drissi.com/api](https://youssef-maazouz.stage2-div.rayan-drissi.com/api)**

---

## Identifiants de démonstration

| Rôle | Identifiant |
|---|---|
| Avocat (compte 1) | `avocat1@example.com` / `Test1234!` |
| Avocat (compte 2) | `avocat2@example.com` / `Test1234!` |
| Grafana | voir `GF_SECURITY_ADMIN_USER` / `GF_SECURITY_ADMIN_PASSWORD` dans `.env` du serveur |

Le seed crée automatiquement, pour chaque avocat, une demande en attente et une demande avec au moins une pièce déjà déposée — de quoi tester le dashboard, le lien public et le téléchargement sans rien créer manuellement.

---

## Démarrage en une commande

```bash
git clone <repo>
cd portail-depot-pieces
cp .env.example .env      # remplir les secrets réels
./install.sh
```

`install.sh` fait tout, sans étape manuelle : vérifie les pré-requis (Docker, `docker compose`), tire les images depuis GHCR, démarre la stack, attend que le backend soit prêt, exécute les migrations, seed la base, vérifie que Prometheus et Grafana tournent, et affiche les URLs finales.

La mise en place du certificat HTTPS (Let's Encrypt) est une étape séparée, à faire une seule fois sur un nouveau serveur — voir [Déploiement HTTPS](#déploiement-https).

---

## Architecture

```
                                    ┌─────────────┐
                                    │    nginx    │  ← seul point d'entrée public
                                    │ (TLS + proxy)│    127.0.0.1:21500 (HTTP)
                                    └──────┬──────┘    127.0.0.1:21501 (HTTPS)
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
             ┌──────▼──────┐        ┌───────▼──────┐        ┌───────▼──────┐
             │  frontend   │        │   backend    │        │   grafana    │
             │  (Next.js)  │        │  (NestJS)    │        │              │
             └─────────────┘        └───────┬──────┘        └───────┬──────┘
                                             │                       │
                    ┌────────────────────────┼───────────────────────┘
                    │                        │
             ┌──────▼──────┐         ┌───────▼──────┐        ┌──────────────┐
             │  postgres   │         │    minio     │        │  prometheus   │
             │             │         │  (S3-compat) │◄───────┤  (scrape)     │
             └─────────────┘         └──────────────┘        └──────────────┘
```

Tous les services communiquent via un réseau Docker interne (`cicd-network`). **Seul `nginx` publie des ports vers l'hôte** — tous les autres services (`backend`, `frontend`, `db`, `minio`, `prometheus`, `grafana`) utilisent `expose:` uniquement, jamais `ports:`, conformément à la contrainte de l'environnement partagé (plage de ports assignée, rien d'autre joignable depuis l'extérieur).

### Backend — NestJS

- **Auth avocat** : email/password, JWT classique (`~1 jour`), stocké côté client, protège les routes `/requests/*`.
- **Auth dépôt anonyme** : le client déposant n'a jamais de compte. Il ouvre un lien contenant un `publicToken`, saisit un PIN à 6 chiffres. Une fois validé, il reçoit un **second JWT, distinct** (`deposit-session`, `~30 min`, secret différent) qui autorise uniquement l'upload/listing sur la demande ciblée. Les deux mondes d'authentification sont volontairement isolés — un token de dépôt ne peut jamais être accepté par les routes avocat, et inversement (couvert par test, voir [Stratégie de tests](#stratégie-de-tests)).
- **Stockage** : MinIO (S3-compatible), conteneurisé, aucun fichier n'est jamais écrit sur le disque local de l'application. Les téléchargements passent par des **URLs pré-signées** générées à la demande (validité 15 min), pas par un endpoint de l'API qui streamerait le fichier.
- **Observabilité** : métriques Prometheus custom exposées sur `/metrics` (interne au réseau Docker, jamais routé publiquement par nginx).

### Frontend — Next.js + Chakra UI v3

- App Router, respecte la charte graphique DIV Protocol (tokens de couleur, radius, typographie, comportement d'inversion du bouton primaire au survol).
- Client API généré automatiquement depuis le contrat OpenAPI du backend (`openapi-generator-cli`, `typescript-fetch`) — pas de fetch à la main, le typage suit le backend.
- Deux contextes d'authentification séparés côté client également (stockage du JWT avocat persistant vs JWT de session de dépôt en mémoire uniquement, jamais en `localStorage`, cohérent avec sa courte durée de vie).

---

## Choix d'architecture justifiés

**Pourquoi deux JWT distincts (avocat / session de dépôt) plutôt qu'un système de rôles unique.**
Les deux tokens ont des payloads, des durées de vie et des niveaux de confiance radicalement différents. Les fusionner dans un seul système à rôles aurait été un piège à erreur de configuration : une confusion de guard aurait pu laisser un token de dépôt (émis à un client anonyme, potentiellement partagé par erreur) accéder à des routes avocat. Deux secrets, deux stratégies Passport, deux guards distincts éliminent cette classe de bug par construction plutôt que par discipline de code.

**Pourquoi le statut d'une demande (`en_attente` / `complete` / `expiree`) n'est jamais stocké en base.**
Le stocker imposerait un job périodique pour le maintenir à jour (une demande qui expire ne "devient" pas expirée toute seule dans une colonne figée). Le calculer à la volée depuis `expiresAt` et le nombre de fichiers déposés élimine cette classe de bug de synchronisation, au prix d'un calcul trivial à chaque lecture.

**Pourquoi les URLs de téléchargement sont pré-signées plutôt que servies par une route de l'API.**
Faire transiter chaque téléchargement par le backend consommerait sa bande passante et son temps CPU pour un simple relais de fichier. Une URL pré-signée permet au navigateur de télécharger directement depuis MinIO, avec une autorisation limitée dans le temps (15 min) et scopée à un seul fichier — le backend ne fait que délivrer l'autorisation, jamais le contenu.

**Pourquoi le build des images est fait en local/CI et jamais sur le serveur de déploiement.**
Contrainte explicite de l'environnement partagé : le serveur ne doit contenir aucun code source, uniquement de la configuration (`docker-compose.yaml`, `Makefile`, `.env`, config nginx). Les images sont construites soit en local soit via GitHub Actions, publiées sur GitHub Container Registry, puis simplement tirées (`docker compose pull`) sur le serveur. `install.sh` ne contient donc jamais de `--build`.

**Pourquoi le lockout de PIN est par token plutôt que par IP seule.**
Une limitation par IP seule est contournable (rotation d'IP) et pénalise à tort les réseaux partagés (plusieurs utilisateurs légitimes derrière une même IP d'entreprise). Le verrouillage par `publicToken` cible directement le lien attaqué, indépendamment de la provenance des requêtes ; il est complémentaire — pas redondant — avec le throttling IP global qui protège contre le bruit générique.

---

## Modèle de données

```
Lawyer
├── id (uuid)
├── email (unique)
├── password (hash bcrypt, jamais sélectionné par défaut)
├── name
└── createdAt

DepositRequest
├── id (uuid)
├── title
├── publicToken (unique, aléatoire, 12 bytes)
├── pinHash (bcrypt, jamais sélectionné par défaut — le PIN n'est JAMAIS
│            récupérable après création, même par l'avocat)
├── expiresAt
├── lawyer → ManyToOne Lawyer (onDelete CASCADE)
├── files → OneToMany DepositedFile
└── createdAt

DepositedFile
├── id (uuid)
├── request → ManyToOne DepositRequest (onDelete CASCADE)
├── storageKey (chemin MinIO, jamais exposé au client)
├── originalName
├── mimeType
├── sizeBytes
└── uploadedAt

DepositSession
├── id (uuid)
├── request → ManyToOne DepositRequest
├── expiresAt (~30 min après unlock())
└── (le JWT de session encode uniquement { sub: requestId })
```

Le PIN (6 chiffres, généré par `crypto.randomInt`, jamais `Math.random`) est renvoyé **une seule fois**, dans la réponse de création — l'avocat doit le transmettre à son client par un canal externe. Il n'existe ensuite qu'à l'état haché, y compris pour l'avocat lui-même.

---

## Stratégie de tests

Tests unitaires Jest, ciblés sur la logique métier à risque plutôt que sur une couverture exhaustive — cohérent avec le périmètre demandé (expiration de lien, vérification de PIN, transitions de statut).

- **`computeStatus()`** : les trois transitions (`en_attente` / `complete` / `expiree`), y compris le cas limite où l'expiration et la présence de fichiers entrent en conflit (l'expiration l'emporte toujours).
- **Isolation des avocats** : un avocat ne peut jamais accéder à une demande appartenant à un autre, sans fuite d'information dans le message d'erreur (404 générique, pas "cette demande appartient à quelqu'un d'autre").
- **`unlock()`** : succès, token inconnu, lien expiré (avec vérification que `bcrypt.compare` n'est **jamais appelé** dans ce cas — l'expiration est vérifiée avant le PIN, pas de calcul de hash inutile), PIN incorrect avec un message strictement identique au cas "token inconnu" (aucune fuite d'information sur la nature de l'échec).
- **Lockout par token** : 5 tentatives échouées verrouillent le lien ; la 6ème tentative est rejetée **même avec le bon PIN**, preuve que le verrouillage bloque réellement et non qu'il se contente de compter. Le compteur est confirmé remis à zéro après un déverrouillage réussi.
- **Isolation des deux mondes JWT** : un token signé avec le secret de session de dépôt est rejeté par la stratégie JWT avocat, et réciproquement — la propriété de sécurité la plus critique du système, testée explicitement plutôt que supposée.
- **Fichiers** : `storeFile()` revérifie l'expiration au moment de l'upload (pas seulement à l'ouverture de session — un lien peut expirer pendant qu'une session de dépôt de 30 min est encore techniquement valide) ; `listFiles()` ne retourne jamais les fichiers d'une autre demande.

Exécution : `npm run test` (backend). Intégré en CI, voir plus bas.

---

## Périmètre d'observabilité

Aucune liste de métriques n'était imposée — le choix a été volontairement limité à trois métriques applicatives custom, choisies parce qu'elles correspondent à de vrais modes de défaillance de ce produit précis, plutôt qu'à une instrumentation exhaustive et décorative.

| Métrique | Pourquoi |
|---|---|
| `storage_upload_failures_total` / `storage_upload_successes_total` | L'upload vers MinIO est le point de défaillance le plus critique du parcours de dépôt — un échec silencieux signifie qu'un client pense avoir déposé une pièce qui n'existe pas. |
| `pin_verification_failures_total` | Un pic isolé sur ce compteur est le signal direct d'une tentative de force brute contre un lien de dépôt — c'est la métrique de sécurité la plus actionnable du système. |
| `http_requests_total` (labellisée méthode/route/code) | Alimentée automatiquement par un intercepteur global, permet de calculer le taux d'erreurs 5xx sur `/public/*` — la surface exposée aux utilisateurs anonymes, la plus sensible puisqu'elle n'a aucune authentification en amont pour aider au diagnostic. |

Complétées par les métriques process Node.js par défaut (mémoire, event loop lag, GC) — signal gratuit, aucun effort d'instrumentation supplémentaire.

**Deux alertes Prometheus**, pas de simple tableau de bord passif :
- `HighPinFailureRate` — se déclenche si le taux d'échecs PIN dépasse un seuil soutenu sur 2 minutes, signalant une attaque en cours.
- `StorageUploadFailureRatio` — se déclenche si plus de 10 % des tentatives d'upload échouent sur une fenêtre de 5 minutes, signalant une dégradation de MinIO ou du réseau interne.

Le tableau de bord Grafana (`portail-overview`) est **provisionné automatiquement** via fichiers (datasource + dashboard JSON committés dans `infra/grafana/`), aucune configuration manuelle requise au déploiement — cohérent avec l'exigence de `install.sh` one-click.

---

## Sécurité — au-delà de l'authentification

- **PIN à 6 chiffres**, haché bcrypt, jamais journalisé, jamais renvoyé après sa création.
- **Rate limiting IP** (`@nestjs/throttler`) sur `POST /public/unlock` : 5 tentatives / 60 secondes par IP.
- **Lockout par token** : 5 échecs sur une fenêtre glissante de 15 minutes verrouillent un lien spécifique, indépendamment de l'IP d'origine — voir [justification](#choix-darchitecture-justifiés) plus haut.
- **Messages d'erreur génériques** : un token inconnu, un PIN incorrect et un lien verrouillé renvoient tous le même message, pour ne jamais donner à un attaquant de signal distinctif sur la raison exacte de l'échec.
- **URLs de dépôt pré-signées** plutôt qu'un upload/download transitant par une route API classique, avec expiration courte (15 min).
- Secrets (JWT, session de dépôt, MinIO, Grafana) systématiquement hors du repo, injectés via variables d'environnement — voir `.env.example`.

---

## Limites connues

Documentées explicitement plutôt que découvertes en review :

- **Le lockout de PIN est en mémoire** (`Map` dans `PublicService`), pas persisté. Il se réinitialise à chaque redémarrage du backend et n'est pas partagé entre plusieurs instances si l'application était un jour répliquée horizontalement. Acceptable au périmètre actuel (déploiement mono-instance) ; une vraie mise à l'échelle nécessiterait un store partagé (Redis).
- **Le script de seed vide entièrement les tables** (`TRUNCATE ... CASCADE`) à chaque exécution. `install.sh` peut donc être relancé sans erreur, mais toute donnée créée entre deux exécutions (tests manuels compris) est perdue. Ne pas relancer `install.sh` sur un environnement dont les données doivent être conservées.
- **Déploiement mono-instance**, pas de haute disponibilité. Cohérent avec le contexte de l'exercice (un serveur partagé, une plage de ports assignée), pas dimensionné pour de la production à charge réelle.
- **Pas d'antivirus ni de vérification de type de fichier** sur les pièces déposées au-delà de la validation d'extension côté frontend — un client malveillant pourrait techniquement déposer un fichier dont le contenu ne correspond pas à son extension déclarée.
- **Pas de journal d'audit persistant** des accès aux liens publics au-delà des métriques Prometheus agrégées (rétention 15 jours) — pas de trace nominative et durable consultable après coup pour un lien donné.

---

## Déploiement HTTPS

Le certificat Let's Encrypt est mis en place une seule fois par serveur (le renouvellement automatique tourne ensuite en tâche de fond via le service `certbot`) :

```bash
make bootstrap          # nginx en HTTP seul, sert le challenge ACME
make certs-staging      # certificat de test — à valider avant de consommer le quota réel
make enable-ssl         # active le nginx HTTPS avec le certificat obtenu
make certs-prod         # remplace par un certificat de production
make enable-ssl         # recharge nginx avec le certificat de production
```

Le renouvellement est ensuite automatique (`certbot renew` en boucle toutes les 12h dans le service `certbot`), sans action manuelle.

---

## CI/CD

- **CI** (`.github/workflows/ci.yml`) : exécute la suite Jest à chaque push et pull request vers `master`.
- **Build & Push** (`.github/workflows/build-and-push.yml`) : construit et publie les images backend/frontend sur GHCR à chaque push sur `master`.
- Le **déploiement sur le serveur reste manuel** (`./install.sh` exécuté explicitement) — automatiser un déploiement SSH vers un serveur partagé avec d'autres candidats a été jugé comme un risque disproportionné par rapport au bénéfice pour ce contexte précis.

---

## Structure du repo

```
├── backend/            # NestJS — API, auth, stockage, métriques
├── frontend/            # Next.js — interface avocat + dépôt public
├── infra/
│   ├── nginx/            # config reverse proxy (templates + conf active)
│   ├── prometheus/       # scrape config + règles d'alerte
│   ├── grafana/          # provisioning datasource + dashboard
│   └── certbot/          # certificats Let's Encrypt (généré, pas versionné)
├── ai-logs/              # export des conversations IA utilisées sur ce projet
├── docker-compose.yaml           # stack de production (images tirées, pas de build)
├── docker-compose.override.yaml  # ports exposés en local pour le développement uniquement
├── install.sh            # one-click : pull, up, migrations, seed, vérification observabilité
├── Makefile               # cibles TLS (bootstrap, certs-staging, certs-prod, enable-ssl)
└── .env.example           # toutes les variables requises, sans valeurs réelles
```