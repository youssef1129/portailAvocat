#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Portail de Depot de Pieces — one-click install
# Build, start the stack, run migrations, seed the database, print URLs.
# ---------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() { echo -e "\n\033[1;34m==>\033[0m $1"; }
err() { echo -e "\033[1;31mErreur:\033[0m $1" >&2; }

# ---------------------------------------------------------------------------
# 0. Pre-flight checks
# ---------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
  err "Docker n'est pas installe ou pas dans le PATH."
  exit 1
fi

if [ ! -f ".env" ]; then
  err "Fichier .env introuvable a la racine. Copie .env.example vers .env et remplis les valeurs."
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Build + start the stack
# ---------------------------------------------------------------------------
log "Build des images et demarrage de la stack..."
docker compose up -d --build

# ---------------------------------------------------------------------------
# 2. Wait for backend to be healthy
# ---------------------------------------------------------------------------
log "Attente que le backend soit pret..."

BACKEND_CID="$(docker compose ps -q backend)"
if [ -z "$BACKEND_CID" ]; then
  err "Le conteneur backend n'a pas demarre. Verifie 'docker compose logs backend'."
  exit 1
fi

TIMEOUT=90
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
BACKEND_PORT="$(grep -E '^PORT=' .env | cut -d '=' -f2 | tr -d '[:space:]')"
MINIO_CONSOLE_PORT="$(grep -E '^MINIO_CONSOLE_PORT=' .env | cut -d '=' -f2 | tr -d '[:space:]')"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-21507}"
BACKEND_PORT="${BACKEND_PORT:-21501}"

echo ""
echo "======================================================================"
echo " Installation terminee."
echo "======================================================================"
echo " Backend API      : http://localhost:${BACKEND_PORT}"
echo " Swagger docs      : http://localhost:${BACKEND_PORT}/docs"
echo " MinIO console      : http://localhost:${MINIO_CONSOLE_PORT}"
echo ""
echo " Compte avocat demo : voir backend/src/seed.ts (email + mot de passe demo)"
echo "======================================================================"