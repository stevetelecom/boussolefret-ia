# BoussoleFret IA

Assistant intelligent de conformité et de connaissance réglementaire pour le fret CEMAC — projet de stage, Flysoft Engineering SAS.

> Complémentaire de FretCorridor (pas de matching camion-fret, pas de financement). Répond aux questions réglementaires (LVO/LVI, quotas, tarifs) par recherche sémantique et RAG, et détecte les documents atypiques par similarité vectorielle.

---

## 1. Choix du backend — Go, et uniquement Go

> ⚠️ Correction vs. version précédente : le CDC (§9.1–9.4, ENF-PLT-01 à 05) impose une **stack backend unique en Go**, pas d'architecture polyglotte Go + Python. Ce choix n'est pas une préférence technique mais une exigence non fonctionnelle du cahier des charges.

Le CDC BoussoleFret IA (FSE-CDC-BOUSSOLEFRET-2026-001, §9.2) définit explicitement tous les services backend en **Go** :

| Service | Rôle (CDC §9.2) |
|---|---|
| **Passerelle / BFF** | Authentification, rate-limit, idempotence, agrégation des appels vers les services métier |
| **Service RAG** | Recherche par similarité (pgvector), construction du contexte, appel au LLM externe, citation des sources |
| **Service Ingestion (COR)** | Vectorisation, versionning et indexation du corpus réglementaire |
| **Service Anomalies (ANO)** | Analyse de similarité documentaire, scoring de risque, file de contrôle |

**Pourquoi pas un microservice Python (FastAPI/LangChain) pour le RAG ?** Le CDC ne prévoit pas cette brique : introduire un second langage dupliquerait une partie de la logique métier (ENF-PLT-01 : *« aucune logique métier dupliquée côté client »*, principe étendu ici à l'ensemble de la plateforme) et ajouterait une base de code, un pipeline CI/CD et une surface d'exploitation supplémentaires que le CDC cherche justement à éviter (§9.3 : *réutilisation, pas de troisième base de code*). L'appel au LLM externe et le calcul de similarité pgvector se font depuis Go via une **passerelle Go dédiée** (§9.1, R3).

**Pourquoi pas Spring Boot ou Django ?** Aucun des deux n'est retenu : ils réintroduiraient exactement le même problème (langage/stack divergent de celui validé pour FretCorridor et repris par ce CDC), sans bénéfice pour la partie RAG (l'écosystème d'embeddings/LLM le plus mûr reste consommable en Go via API HTTP, sans nécessiter un runtime Python dédié).

**Règle de communication** : `go-api` reste le point d'entrée unique pour les clients (web/mobile/desktop) et porte le RBAC/multi-tenant, l'ingestion, le RAG et la détection d'anomalies — soit dans un seul binaire modulaire (Clean Architecture, packages séparés), soit en plusieurs services Go internes communiquant via NATS, mais **jamais via un service dans un autre langage**.

---

## 2. Architecture cible

```
                     ┌───────────────────────────────────────────────┐
                     │                  Clients                       │
                     │  Angular (PWA)   Flutter (mobile)   Desktop    │
                     │  web bureaux     agents terrain   (packaging   │
                     │                                    natif du    │
                     │                                    client Web, │
                     │                                    Tauri/      │
                     │                                    Electron)   │
                     └───────────────────────┬─────────────────────────┘
                                              │ HTTPS / REST (API Go unique, versionnée)
                                              ▼
                     ┌───────────────────────────────────────────────┐
                     │               go-api  (Go, Clean Architecture) │
                     │  Passerelle/BFF · Auth · RBAC · Multi-tenant   │
                     │  Service RAG · Service Ingestion (COR)         │
                     │  Service Anomalies (ANO) · Audit               │
                     └───────┬───────────────┬──────────────┬─────────┘
                              │               │              │
                       appel LLM        pub/sub events   lecture/écriture
                       (passerelle Go)        │              │
                              ▼               ▼              ▼
                  ┌────────────────┐   ┌────────────┐  ┌──────────────┐
                  │  LLM externe    │   │    NATS     │  │  PostgreSQL   │
                  │  (API tierce)   │   │ (bus événe- │  │  + pgvector   │
                  │                 │   │ ments :     │  │  (embeddings, │
                  │                 │   │ ingestion,  │  │   documents,  │
                  │                 │   │ ré-indexation)│ │   audit)      │
                  └─────────────────┘   └────────────┘  └──────┬────────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  Redis (cache)│
                                                          │  réponses     │
                                                          │  fréquentes   │
                                                          └──────┬────────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  MinIO        │
                                                          │  (documents   │
                                                          │   source)     │
                                                          └──────────────┘
```

**Flux d'ingestion d'un document** : `go-api` reçoit le document (upload web/mobile) → stockage brut dans MinIO → événement publié sur NATS (`docs.ingested`) → le module Ingestion (COR) de `go-api` consomme l'événement, calcule les embeddings, les indexe dans `pgvector` → le module RAG interroge ensuite pgvector + le LLM externe pour produire une réponse citant ses sources, avec **abstention explicite** si la similarité est insuffisante (EF-RAG-03).

---

## 3. Stack technique

| Brique | Technologie | Rôle |
|---|---|---|
| Backend (unique) | **Go**, Gin, Clean Architecture | API, RBAC, multi-tenant, RAG, ingestion, anomalies, audit |
| Base de données vectorielle | PostgreSQL 16 + extension `pgvector` | Indexation et recherche par similarité |
| Cache | Redis 7 | Cache des réponses fréquentes, rate-limit, verrous |
| Stockage documentaire | MinIO | Documents source (LVO/LVI, textes réglementaires) |
| Bus d'événements | NATS (JetStream) | Ingestion asynchrone, ré-indexation, notifications |
| LLM | API tierce, appelée via passerelle Go dédiée | Génération de la réponse en langage naturel à partir du contexte RAG |
| Web | Angular (PWA) | Portail bureaux de fret / grands comptes |
| Mobile | Flutter (offline-first) | Application agents de terrain |
| Desktop | **Empaquetage natif du client Angular** (Tauri ou Electron) | Back-office conformité, gouvernance du corpus — *pas une 3ᵉ base de code* (ENF-PLT-03) |
| Conteneurisation | Docker, Docker Compose | Environnement de développement local |

---

## 4. Prérequis

- Docker Desktop (ou Docker Engine + Compose plugin) ≥ 24
- Git
- Go ≥ 1.22 (dev local hors conteneur, optionnel)
- Node.js ≥ 20 + Angular CLI (pour `clients/web-angular`, et pour le packaging Desktop qui réutilise ce même code)
- Flutter SDK ≥ 3.22 (pour `clients/mobile-flutter` uniquement, phase 2)
- Rust ≥ 1.75 (si packaging Desktop en Tauri) **ou** Electron/Node (si packaging Desktop en Electron) — phase 3

---

## 5. Démarrage rapide (local, Docker)

```bash
# 1. Cloner le dépôt
git clone <url-du-depot> boussolefret-ia
cd boussolefret-ia

# 2. Copier le fichier d'environnement
cp .env.example .env
# → ajuster les valeurs si besoin (clé API LLM notamment)

# 3. Lancer l'ensemble des services
docker compose up --build

# 4. Vérifier que tout répond
curl http://localhost:8080/health     # go-api
```

Services exposés une fois `docker compose up` lancé :

| Service | URL locale | Description |
|---|---|---|
| go-api | http://localhost:8080 | API principale (auth, RBAC, RAG, ingestion, anomalies) |
| PostgreSQL | localhost:5432 | `boussolefret` / voir `.env` |
| MinIO Console | http://localhost:9001 | Identifiants dans `.env` |
| NATS monitoring | http://localhost:8222 | Monitoring du bus d'événements |

Pour arrêter : `docker compose down` (ajouter `-v` pour repartir de zéro, y compris les données).

---

## 6. Structure du dépôt

```
boussolefret-ia/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── services/
│   └── go-api/                  # Backend unique (Go)
│       ├── cmd/api/main.go
│       ├── internal/
│       │   ├── rag/             # Service RAG : recherche pgvector, appel LLM, citation sources
│       │   ├── ingestion/       # Service Ingestion (COR) : embeddings, versionning corpus
│       │   ├── anomalies/       # Service Anomalies (ANO) : scoring de risque
│       │   ├── auth/            # RBAC, multi-tenant
│       │   └── audit/           # Journal d'audit append-only
│       ├── go.mod
│       └── Dockerfile
├── clients/
│   ├── web-angular/             # Portail web (phase 1)
│   ├── mobile-flutter/          # App agents de terrain (phase 2)
│   └── desktop/                 # Packaging natif du client web-angular (Tauri/Electron, phase 3)
├── infra/
│   └── postgres/
│       └── init.sql             # Activation de l'extension pgvector
└── docs/
    └── architecture.md          # Détails d'architecture (à enrichir)
```

---

## 7. Variables d'environnement (extrait de `.env.example`)

| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Identifiants PostgreSQL |
| `REDIS_URL` | URL de connexion Redis |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Identifiants MinIO |
| `NATS_URL` | URL du serveur NATS |
| `LLM_API_KEY` | Clé de l'API du modèle de langage, utilisée par le module RAG de `go-api` |
| `JWT_SECRET` | Secret de signature des jetons d'authentification |

---

## 8. Feuille de route de stage (alignée sur le phasage du CDC, §13)

| Phase CDC | Semaines | Jalon |
|---|---|---|
| Phase 0 — Validation | S1–S2 | Cadrage, corpus réglementaire, schéma pgvector, maquettes, verrous Go/No-Go |
| Phase 1 — MVP RAG + Web | S3–S4 | Pipeline RAG : ingestion NATS → embeddings → indexation pgvector → API de recherche + client Web |
| Phase 2 — Mobile + Anomalies | S5–S6 | App Flutter mobile (offline-first), détection d'anomalies documentaires |
| Phase 3 — Desktop + Multi-bureau | S7 | Packaging Desktop (Tauri/Electron sur client Angular), journal d'audit, isolation multi-tenant |
| Consolidation | S8 | Tests, démonstration à la Direction Technique |

---

## 9. Conventions de travail

- Branches : `feature/<module>-<courte-description>`, `fix/<courte-description>`
- Commits : préfixe par module (`go-api:`, `rag:`, `ingestion:`, `anomalies:`, `docs:`, `infra:`) suivi d'un résumé court à l'impératif
- Un seul backend (`go-api`), modulaire en interne (Clean Architecture) ; toute nouvelle brique métier reste en Go, conformément au CDC — aucune logique de pertinence ou de seuil ne doit être portée par un client ou par un service dans un autre langage

---

**Classification** : Confidentiel — usage interne Flysoft Engineering SAS.
