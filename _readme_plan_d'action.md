# BoussoleFret IA — Plan d'action de développement

> Dérivé du CDC `FSE-CDC-BOUSSOLEFRET-2026-001` v1.0 (27/07/2026).
> Assistant RAG de conformité réglementaire fret CEMAC — Web / Mobile / Desktop sur backend Go unique.

**Garde-fous non négociables (à respecter à chaque phase) :**
- 🚫 Aucune réponse sans source citée → abstention si similarité insuffisante.
- 🚫 Aucun flux financier ni matching camion-fret (ça, c'est FretCorridor).
- 🔒 Gouvernance stricte du corpus : isolation multi-tenant par bureau.

---

## Phase 0 — Verrous de validation (avant tout développement de portée)

Aucun développement ne démarre tant que ces conditions ne sont pas levées.

- [ ] Obtenir l'accord d'au moins un bureau de fret (BGFT en priorité) pour fournir un corpus réglementaire exploitable et à jour
- [ ] Cartographier le corpus disponible (textes, circulaires, barèmes)
- [ ] Valider le budget d'appel à une API LLM externe (soutenable au volume attendu)
- [ ] Mener les entretiens grands comptes (cimentiers, brasseries) pour confirmer l'appétence

**Jalon Go/No-Go :** Go si corpus disponible **ET** accord de principe d'un bureau **ET** budget LLM validé.
**Durée indicative :** 4–6 semaines.

---

## Phase 1 — MVP RAG + Web (3–4 mois)

Objectif : livrer la valeur cœur (RAG) sur **un seul bureau**, via le **client Web** et le canal **WhatsApp**.

### Socle backend Go (transverse, à construire en premier)
- [ ] API Go unique versionnée (REST) — Clean Architecture
- [ ] Authentification, RBAC multi-tenant (Administrateur corpus, Responsable conformité, Agent, Chargeur)
- [ ] Passerelle/BFF Go : rate-limit, idempotence, agrégation des appels
- [ ] Observabilité (logs, métriques) + CI/CD, environnements séparés, secrets centralisés

### Service Ingestion du corpus (COR)
- [ ] Import des textes réglementaires initiaux (OCR si scans)
- [ ] Vectorisation (embeddings) et indexation pgvector
- [ ] Versionning des textes réglementaires + date d'effet

### Service RAG (cœur produit)
- [ ] Recherche par similarité (pgvector)
- [ ] Construction du contexte + appel LLM externe via passerelle dédiée
- [ ] Citation systématique des sources
- [ ] **Abstention explicite obligatoire** si similarité insuffisante (EF-RAG-03)

### Client Web (Angular PWA)
- [ ] Poser une question, consulter historique + sources citées
- [ ] Import par lot de documents de transport
- [ ] Back-office responsable conformité (questions fréquentes, zones de flou, enrichissement corpus)
- [ ] Dégradation gracieuse sur connexion faible (cache PWA)

### Canal WhatsApp (BSP)
- [ ] Intégration mode "pull", fenêtre de service 24h
- [ ] Stratégie de repli automatique vers Web/Mobile si sur-sollicité (coût maîtrisé)

**Jalon Go/No-Go :** pilote sur 1 bureau ; taux de réponses sourcées et fiables mesuré ; premiers retours utilisateurs.

---

## Phase 2 — Mobile + Anomalies (2–3 mois)

Objectif : étendre aux agents terrain et ajouter la détection de documents atypiques.

### Client Mobile (Flutter, offline-first)
- [ ] Question en langage naturel + réponse sourcée, y compris hors connexion stable
- [ ] Capture photo d'un document de transport → soumission pour analyse d'anomalie
- [ ] Mode offline-first : file locale, synchronisation au retour réseau
- [ ] Notifications push (réponses différées, alertes anomalie)
- [ ] Authentification RBAC partagée avec les autres clients

### Service Anomalies (ANO)
- [ ] Scoring de risque par écart de similarité au corpus habituel
- [ ] File de contrôle pour validation humaine (annotation, décision)

**Jalon Go/No-Go :** adoption terrain mesurée ; taux de détection d'anomalies validé par le responsable conformité.

---

## Phase 3 — Desktop + Multi-bureau (2–3 mois)

Objectif : gouvernance du corpus et réplication à un 2ᵉ bureau (BNFT).

### Client Desktop (packaging natif du client Web — Tauri ou Electron)
- [ ] Administration du corpus : ajout, retrait, versionning par bureau
- [ ] Supervision analytique : historique Q/R, zones de flou, taux de couverture par corpus
- [ ] Validation humaine des documents en anomalie (annotation + décision)
- [ ] Export/sauvegarde du corpus et journaux d'audit
- [ ] Gestion multi-bureau avec isolation stricte des données

### Sécurité, audit, multi-tenant durci
- [ ] Journal d'audit append-only (modifications corpus, décisions anomalie)
- [ ] Tests automatisés d'isolation multi-tenant à chaque déploiement
- [ ] Chiffrement en transit et au repos

**Jalon Go/No-Go :** 2ᵉ bureau actif ; isolation multi-tenant vérifiée ; SLO tenus.

---

## Phase 4 — Intégration FretCorridor (optionnelle, à planifier)

- [ ] Portail partenaire commun
- [ ] Identité tenant partagée (RBAC commun)
- [ ] Rapprochement mission ↔ pièce réglementaire (API EF-INT-04)

> ⚠️ Cette phase ne doit jamais être un prérequis bloquant : BoussoleFret IA garde sa valeur autonome.

---

## Stack technique de développement

| Composant | Technologie | Rôle |
|---|---|---|
| Backend / API | **Go** (Clean Architecture) | API unique, RBAC, logique métier centralisée |
| Base vectorielle | **PostgreSQL + pgvector** | Stockage embeddings, recherche par similarité |
| Cache | **Redis** | Réponses fréquentes, sessions, rate-limit WhatsApp |
| Stockage documentaire | **MinIO** | Documents sources, textes réglementaires, pièces jointes |
| Bus d'événements | **NATS / Kafka** | Ingestion asynchrone, ré-indexation, notifications |
| Client Web | **Angular (PWA)** | Bureaux de fret, grands comptes, back-office |
| Client Mobile | **Flutter** (iOS/Android, offline-first) | Agents terrain, chauffeurs |
| Client Desktop | **Tauri ou Electron** (packaging du client Angular) | Administration corpus, gouvernance |
| LLM | **API tierce** via passerelle Go dédiée | Génération de la réponse en langage naturel |
| OCR | Service externe | Extraction de texte des documents scannés |
| CI/CD | IaC, environnements séparés | Déploiement reproductible |

### Principes d'architecture à respecter
- Une seule API Go consommée identiquement par les 3 clients — **aucune logique métier dupliquée côté client**.
- Desktop = packaging natif du client Angular (pas un 3ᵉ front indépendant) → 2 bases de code à maintenir (Angular + Flutter), pas 3.
- Multi-tenant dès l'origine : un corpus isolé par bureau.
- Comportement RAG et abstention **strictement identiques** quel que soit le canal (WhatsApp, Web, Mobile, Desktop).

### Anti-patterns à proscrire
- ❌ Dupliquer le calcul de pertinence/seuils d'anomalie dans un client plutôt que dans le backend Go.
- ❌ Développer un 3ᵉ front indépendant pour le Desktop.
- ❌ Répondre sans source citée ou reformuler de mémoire.
- ❌ Mutualiser les corpus entre tenants "pour simplifier".

---

## Indicateurs clés de suivi

| Indicateur | Cible | Horizon |
|---|---|---|
| Bureaux sous abonnement | ≥ 1 (BGFT), puis 2ᵉ | Ph.1 → Ph.3 |
| Taux de réponses sourcées et fiables | ≥ 90 % | Fin Ph.1 |
| Hallucination non signalée | 0 | Continu |
| Grands comptes payants | 1–3 pilotes | Fin Ph.2 |
| Coût moyen d'appel LLM/question | Sous plafond défini | Continu |

## Top risques à surveiller

1. **R1 — Hallucination** : mitigé par abstention obligatoire + citation systématique + revue humaine.
2. **R2 — Corpus incomplet/obsolète** : Phase 0 conditionnée à la disponibilité effective du corpus.
3. **R3 — Dépendance API LLM externe** : passerelle Go dédiée, budget plafonné, option de repli auto-hébergé.
4. **R6 — Fuite de données entre tenants** : isolation vérifiée par tests automatisés à chaque déploiement.
