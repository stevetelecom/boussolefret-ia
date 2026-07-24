# BoussoleFret IA

Assistant intelligent de conformité et de connaissance réglementaire pour le fret CEMAC — projet de stage, Flysoft Engineering SAS.

> Complémentaire de FretCorridor (pas de matching camion-fret, pas de financement). Répond aux questions réglementaires (LVO/LVI, quotas, tarifs) par recherche sémantique et RAG, et détecte les documents atypiques par similarité vectorielle.

---

## 1. Choix du backend — Go, Spring Boot ou Python/Django ?

Ni Spring Boot ni Django ne sont retenus comme backend principal. Le projet adopte une architecture **polyglotte à deux services**, chacun choisi pour ce qu'il fait le mieux :

| Service | Langage / Framework | Pourquoi |
|---|---|---|
| **`go-api`** — cœur métier | **Go** (Gin) | Cohérent avec la stack déjà choisie par Flysoft pour FretCorridor (Go, Clean Architecture) ; excellent pour le multi-tenant, le RBAC, l'ingestion événementielle (NATS) et les API à forte concurrence. Rien à gagner à changer de langage ici. |
| **`ai-service`** — pipeline IA/RAG | **Python** (FastAPI, *pas* Django) | L'écosystème IA (embeddings, LangChain, sentence-transformers, clients LLM) est quasi exclusivement Python. FastAPI est choisi plutôt que Django : async natif (I/O réseau vers le LLM et pgvector), aucun ORM/admin lourd inutile ici, démarrage et image Docker beaucoup plus légers, mieux adapté à un microservice qu'à une application monolithique. |

**Pourquoi pas Spring Boot ?** Aucun avantage spécifique pour l'IA (Java n'a pas d'écosystème RAG comparable à Python), une JVM plus lourde à conteneuriser/démarrer, et une divergence inutile avec la stack Go déjà validée par la Direction Technique.

**Pourquoi pas tout en Django ?** Django est excellent pour un backend CRUD classique avec admin intégré, mais moins adapté ici : moins performant en environnement événementiel/concurrent, ORM synchrone par défaut, et redondant avec `go-api` qui porte déjà la logique métier, le multi-tenant et l'authentification. Le limiter au rôle de service IA stateless (FastAPI) garde chaque brique simple et remplaçable.

**Règle de communication entre les deux services** : `go-api` reste le point d'entrée unique pour les clients (web/mobile/desktop) et le RBAC/multi-tenant ; il délègue à `ai-service` (REST interne, `http://ai-service:8000`) uniquement les tâches d'embeddings/génération/recherche vectorielle. Aucun client n'appelle `ai-service` directement.

---

## 2. Architecture cible

```
                     ┌───────────────────────────────────────────────┐
                     │                  Clients                       │
                     │  Angular (PWA)   Flutter (mobile)  Flutter     │
                     │  web bureaux     agents terrain    (desktop)   │
                     └───────────────────────┬─────────────────────────┘
                                              │ HTTPS / REST
                                              ▼
                     ┌───────────────────────────────────────────────┐
                     │            go-api  (Go, Gin, Clean Arch)       │
                     │  Auth · RBAC · Multi-tenant · Audit · KNOW/ASK │
                     └───────┬───────────────┬──────────────┬─────────┘
                              │               │              │
                       REST interne     pub/sub events   lecture/écriture
                              │               │              │
                              ▼               ▼              ▼
                  ┌────────────────┐   ┌────────────┐  ┌──────────────┐
                  │  ai-service     │   │    NATS     │  │  PostgreSQL   │
                  │ (Python/FastAPI)│   │ (bus événe- │  │  + pgvector   │
                  │ embeddings, RAG,│◄──┤ ments :     │  │  (embeddings, │
                  │ recherche       │   │ ingestion,  │  │   documents,  │
                  │ sémantique      │   │ ré-indexation)│ │   audit)      │
                  └───────┬─────────┘   └────────────┘  └──────┬────────┘
                          │                                     │
                          ▼                                     ▼
                  ┌────────────────┐                     ┌──────────────┐
                  │  Redis (cache)  │                     │  MinIO        │
                  │  réponses       │                     │  (documents   │
                  │  fréquentes     │                     │   source)     │
                  └────────────────┘                     └──────────────┘
```

**Flux d'ingestion d'un document** : `go-api` reçoit le document (upload web/mobile) → stockage brut dans MinIO → événement publié sur NATS (`docs.ingested`) → `ai-service` consomme l'événement, calcule les embeddings, les indexe dans `pgvector` → `go-api` peut ensuite interroger `ai-service` pour une réponse RAG citant les sources.

---

## 3. Stack technique

| Brique | Technologie | Rôle |
|---|---|---|
| Backend métier | Go 1.22, Gin, Clean Architecture | API, RBAC, multi-tenant, audit |
| Service IA | Python 3.12, FastAPI, LangChain (ou pipeline maison), sentence-transformers / API LLM | Embeddings, RAG, recherche sémantique |
| Base de données vectorielle | PostgreSQL 16 + extension `pgvector` | Indexation et recherche par similarité |
| Cache | Redis 7 | Cache des réponses fréquentes, verrous |
| Stockage documentaire | MinIO | Documents source (LVO/LVI, textes réglementaires) |
| Bus d'événements | NATS (JetStream) | Ingestion asynchrone, ré-indexation |
| Web | Angular (PWA) | Portail bureaux de fret / grands comptes |
| Mobile | Flutter (offline-first) | Application agents de terrain |
| Desktop | Flutter Desktop | Back-office conformité |
| Conteneurisation | Docker, Docker Compose | Environnement de développement local |

---

## 4. Prérequis

- Docker Desktop (ou Docker Engine + Compose plugin) ≥ 24
- Git
- Go ≥ 1.22 (dev local hors conteneur, optionnel)
- Python ≥ 3.12 (dev local hors conteneur, optionnel)
- Node.js ≥ 20 + Angular CLI (pour `clients/web-angular`, à initialiser en phase 2)
- Flutter SDK ≥ 3.22 (pour `clients/mobile-flutter` et `clients/desktop-flutter`, phase 2)

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
curl http://localhost:8000/health     # ai-service
```

Services exposés une fois `docker compose up` lancé :

| Service | URL locale | Description |
|---|---|---|
| go-api | http://localhost:8080 | API principale |
| ai-service | http://localhost:8000 | Service IA (interne, exposé en local pour debug) |
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
│   ├── go-api/              # Backend métier (Go)
│   │   ├── cmd/api/main.go
│   │   ├── go.mod
│   │   └── Dockerfile
│   └── ai-service/          # Pipeline IA/RAG (Python/FastAPI)
│       ├── app/main.py
│       ├── requirements.txt
│       └── Dockerfile
├── clients/
│   ├── web-angular/         # Portail web (phase 2)
│   ├── mobile-flutter/      # App agents de terrain (phase 2)
│   └── desktop-flutter/     # Back-office desktop (phase 2)
├── infra/
│   └── postgres/
│       └── init.sql         # Activation de l'extension pgvector
└── docs/
    └── architecture.md      # Détails d'architecture (à enrichir)
```

---

## 7. Variables d'environnement (extrait de `.env.example`)

| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Identifiants PostgreSQL |
| `REDIS_URL` | URL de connexion Redis |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Identifiants MinIO |
| `NATS_URL` | URL du serveur NATS |
| `AI_SERVICE_URL` | URL interne appelée par `go-api` |
| `LLM_API_KEY` | Clé de l'API du modèle de langage utilisé par `ai-service` |
| `JWT_SECRET` | Secret de signature des jetons d'authentification |

---

## 8. Feuille de route de stage (rappel)

| Semaines | Jalon |
|---|---|
| S1–S2 | Cadrage, corpus réglementaire, schéma pgvector, maquettes |
| S3–S4 | Pipeline RAG : ingestion NATS → embeddings → indexation pgvector → API de recherche |
| S5–S6 | Portail Angular, app Flutter mobile, première version desktop |
| S7 | Détection d'anomalies documentaires, journal d'audit |
| S8 | Consolidation, tests, démonstration à la Direction Technique |

---

## 9. Conventions de travail

- Branches : `feature/<module>-<courte-description>`, `fix/<courte-description>`
- Commits : préfixe par module (`go-api:`, `ai-service:`, `docs:`, `infra:`) suivi d'un résumé court à l'impératif
- Un service = un conteneur = un `Dockerfile` propre à lui ; pas de dépendance croisée en dur entre `go-api` et `ai-service` autre que l'API REST interne

---

**Classification** : Confidentiel — usage interne Flysoft Engineering SAS.
