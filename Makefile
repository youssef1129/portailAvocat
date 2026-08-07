# PortailAvocat — deployment Makefile
# Run on the shared deployment machine (Linux). Never builds images here — pull only.

DOMAIN       ?= youssef-maazouz.stage2-div.rayan-drissi.com
CERTBOT_EMAIL ?= $(shell grep -E '^CERTBOT_EMAIL=' .env 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')

NGINX_CONF_DIR := infra/nginx/conf.d
HTTPS_CONF     := $(NGINX_CONF_DIR)/01-https.conf
HTTPS_TEMPLATE := $(NGINX_CONF_DIR)/01-https.conf.template
HTTP_ACTIVE    := $(NGINX_CONF_DIR)/00-http.conf
HTTP_BOOTSTRAP := $(NGINX_CONF_DIR)/00-http-bootstrap.conf
HTTP_PROD      := $(NGINX_CONF_DIR)/00-http-prod.conf

COMPOSE := docker compose

.PHONY: help dirs pull up down restart logs ps \
        bootstrap certs-staging certs-prod enable-ssl disable-ssl \
        migrate seed install status

help:
	@echo "PortailAvocat deployment targets:"
	@echo ""
	@echo "  make dirs            Create certbot volume directories"
	@echo "  make pull            Pull registry images (no build)"
	@echo "  make bootstrap       Start stack with HTTP-only nginx (for cert issuance)"
	@echo "  make certs-staging   Obtain Let's Encrypt STAGING certificate (safe for testing)"
	@echo "  make enable-ssl      Enable HTTPS nginx config after certs exist"
	@echo "  make certs-prod      Obtain Let's Encrypt PRODUCTION certificate"
	@echo "  make up              Pull + start full stack"
	@echo "  make install         Full first-time install (pull, up, migrate, seed)"
	@echo "  make migrate         Run database migrations"
	@echo "  make seed            Seed demo data"
	@echo "  make down            Stop all services"
	@echo "  make logs            Tail all service logs"
	@echo "  make status          Show service status"
	@echo ""
	@echo "Typical first deploy:"
	@echo "  1. cp .env.example .env  &&  edit secrets"
	@echo "  2. make bootstrap"
	@echo "  3. make certs-staging"
	@echo "  4. make enable-ssl"
	@echo "  5. make install"
	@echo "  6. Once confirmed working: make certs-prod && make enable-ssl"

dirs:
	mkdir -p infra/certbot/conf infra/certbot/www

pull: dirs
	$(COMPOSE) pull

# Start nginx with bootstrap HTTP config (no TLS block — nginx won't fail without certs).
bootstrap: dirs disable-ssl pull
	cp $(HTTP_BOOTSTRAP) $(HTTP_ACTIVE)
	$(COMPOSE) up -d db minio backend frontend nginx certbot

# Issue a STAGING certificate (shared rate limit — use this while iterating).
certs-staging: dirs
	@test -n "$(CERTBOT_EMAIL)" || (echo "Set CERTBOT_EMAIL in .env" && exit 1)
	$(COMPOSE) up -d nginx
	$(COMPOSE) run --rm certbot certonly --webroot \
		-w /var/www/certbot \
		-d $(DOMAIN) \
		--email $(CERTBOT_EMAIL) \
		--agree-tos \
		--no-eff-email \
		--staging \
		--force-renewal
	@echo "Staging certificate issued for $(DOMAIN)."

# Issue a PRODUCTION certificate — only after staging/nginx is confirmed working.
certs-prod: dirs
	@test -n "$(CERTBOT_EMAIL)" || (echo "Set CERTBOT_EMAIL in .env" && exit 1)
	$(COMPOSE) up -d nginx
	$(COMPOSE) run --rm certbot certonly --webroot \
		-w /var/www/certbot \
		-d $(DOMAIN) \
		--email $(CERTBOT_EMAIL) \
		--agree-tos \
		--no-eff-email \
		--force-renewal
	@echo "Production certificate issued for $(DOMAIN)."

enable-ssl:
	@test -f infra/certbot/conf/live/$(DOMAIN)/fullchain.pem || \
		(echo "Certificate not found. Run make certs-staging first." && exit 1)
	cp $(HTTPS_TEMPLATE) $(HTTPS_CONF)
	cp $(HTTP_PROD) $(HTTP_ACTIVE)
	$(COMPOSE) restart nginx
	@echo "HTTPS enabled. Site: https://$(DOMAIN)"

disable-ssl:
	rm -f $(HTTPS_CONF)
	cp $(HTTP_BOOTSTRAP) $(HTTP_ACTIVE)
	$(COMPOSE) restart nginx 2>/dev/null || true
	@echo "HTTPS disabled — bootstrap HTTP config restored."

up: dirs pull
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

ps status:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec -T backend npm run migration:run:prod

seed:
	$(COMPOSE) exec -T backend npm run seed:prod

install: up
	@echo "Waiting for backend to become healthy..."
	@timeout=90; elapsed=0; \
	backend_cid=$$($(COMPOSE) ps -q backend); \
	while [ "$$(docker inspect -f '{{.State.Health.Status}}' $$backend_cid 2>/dev/null)" != "healthy" ]; do \
		if [ $$elapsed -ge $$timeout ]; then echo "Backend not healthy after $${timeout}s"; $(COMPOSE) logs --tail=50 backend; exit 1; fi; \
		sleep 3; elapsed=$$((elapsed + 3)); \
	done
	$(MAKE) migrate
	$(MAKE) seed
	@echo ""
	@echo "======================================================================"
	@echo " Installation terminee."
	@echo "======================================================================"
	@echo " App              : https://$(DOMAIN)"
	@echo " API              : https://$(DOMAIN)/api/v1"
	@echo " Swagger          : https://$(DOMAIN)/api"
	@echo ""
	@echo " Compte avocat demo : avocat1@example.com / Test1234!"
	@echo "======================================================================"
