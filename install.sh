#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Portail de Depot de Pieces — deployment install
# Pulls pre-built images, starts the stack, runs migrations, seeds the DB.
# For TLS bootstrap use: make bootstrap && make certs-staging && make enable-ssl
# ---------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DOMAIN="${DOMAIN:-youssef-maazouz.stage2-div.rayan-drissi.com}"

log() { echo -e "\n\033[1;34m==>\033[0m $1"; }
err() { echo -e "\033[1;31mErreur:\033[0m $1" >&2; }

pause_on_error() {
  local code=$?
  if [ "$code" -ne 0 ]; then
    echo "" >&2
    echo "Installation interrompue (code $code)." >&2
    if [ -t 0 ] || [ -n "${MSYSTEM:-}" ] || [ -n "${WINDIR:-}" ]; then
      read -r -p "Appuie sur Entree pour fermer..." _ || true
    fi
  fi
}
trap pause_on_error EXIT

# ---------------------------------------------------------------------------
# 0. Pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
  err "Docker n'est pas installe ou pas dans le PATH."
  echo "  1. Installe Docker Desktop : https://www.docker.com/products/docker-desktop/" >&2
  echo "  2. Lance Docker Desktop et attends qu'il soit pret." >&2
  echo "  3. Rouvre ce terminal, puis relance : bash install.sh" >&2
  exit 1
fi

if ! docker compose version &> /dev/null; then
  err "Le plugin 'docker compose' est introuvable."
  echo "  Mets a jour Docker Desktop, puis relance ce script." >&2
  exit 1
fi

if ! docker info &> /dev/null; then
  err "Docker est installe mais le daemon ne repond pas."
  echo "  Lance Docker Desktop et attends le statut 'Running', puis relance." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  err "Fichier .env introuvable a la racine."
  echo "  Copie .env.example vers .env, remplis les secrets, puis relance." >&2
  exit 1
fi

mkdir -p infra/certbot/conf infra/certbot/www

# ---------------------------------------------------------------------------
# 1. Pull images + start the stack (no build on deployment machine)
# ---------------------------------------------------------------------------
log "Pull des images et demarrage de la stack..."
docker compose pull
docker compose up -d

# ---------------------------------------------------------------------------
# 2. Wait for backend to be healthy
# ---------------------------------------------------------------------------
log "Attente que le backend soit pret..."

BACKEND_CID="$(docker compose ps -q backend)"
if [ -z "$BACKEND_CID" ]; then
  err "Le conteneur backend n'a pas demarre. Verifie 'docker compose logs backend'."
  exit 1
fi

TIMEOUT=120
ELAPSED=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$BACKEND_CID" 2>/dev/null)" = "healthy" ]; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    err "Le backend n'est pas devenu healthy apres ${TIMEOUT}s."
    echo "Logs backend :"
    docker compose logs --tail=50 backend
    exit 1
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  echo -n "."
done
echo ""
log "Backend pret."

# ---------------------------------------------------------------------------
# 3. Run migrations
# ---------------------------------------------------------------------------
log "Execution des migrations..."
if ! docker compose exec -T backend npm run migration:run:prod; then
  err "Les migrations ont echoue."
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Seed the database
# ---------------------------------------------------------------------------
log "Seed de la base de donnees..."
if ! docker compose exec -T backend npm run seed:prod; then
  err "Le seed a echoue."
  exit 1
fi

# ---------------------------------------------------------------------------
# 5. Print final URLs
# ---------------------------------------------------------------------------
echo ""
echo "======================================================================"
echo " Installation terminee."
echo "======================================================================"
echo " App              : https://${DOMAIN}"
echo " API              : https://${DOMAIN}/api/v1"
echo " Swagger          : https://${DOMAIN}/api"
echo ""
if [ ! -f "infra/nginx/conf.d/01-https.conf" ]; then
  echo " TLS pas encore active. Sur le serveur de deploiement :"
  echo "   make bootstrap && make certs-staging && make enable-ssl"
  echo ""
fi
echo " Compte avocat demo : avocat1@example.com / Test1234!"
echo "======================================================================"

trap - EXIT
