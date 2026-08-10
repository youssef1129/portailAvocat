# Rendu — Exercice Technique DIV Protocol

Deux exercices, deux régimes : le premier sans aucune assistance IA, le second avec toute l'assistance possible.

## Structure du repo

```
repo-root/
├── exo1-no-ai/           # Clash of Code, Advent of Code, Quiz — sans IA, sans internet
└── exo2-portail-depot/   # Portail de Dépôt de Pièces — backend, frontend, infra, déploiement
```

---

## [`exo1-no-ai/`](./exo1-no-ai/)

Session unique, filmée de bout en bout. Trois composantes : Clash of Code (CodinGame), un puzzle Advent of Code, et un quiz technique.

Voir le [README dédié](./exo1-no-ai/README.md) pour les preuves (profil CodinGame, enregistrement vidéo), le raisonnement sur le puzzle, et le détail des résultats.

## [`exo2-portail-depot/`](./exo2-portail-depot/)

Application complète : portail permettant à un avocat de créer des demandes de dépôt de pièces protégées par lien expirable + PIN, avec dépôt anonyme côté client. NestJS, Next.js/Chakra UI v3, PostgreSQL, MinIO, Prometheus/Grafana, déployé en HTTPS.

**Application déployée** : [https://youssef-maazouz.stage2-div.rayan-drissi.com](https://youssef-maazouz.stage2-div.rayan-drissi.com)

Voir le [README dédié](./exo2-portail-depot/Readme.md) pour l'architecture, les choix techniques justifiés, la stratégie de tests, le périmètre d'observabilité, les limites connues, et l'export des conversations IA (`ai-logs/`).

---

## Auteur

Youssef Maazouz