-- Activation de l'extension vectorielle
CREATE EXTENSION IF NOT EXISTS vector;

-- Table de base pour les segments de documents indexés (embeddings)
-- FIX: dimension corrigée à 768 pour nomic-embed-text (était 1536 pour OpenAI)
CREATE TABLE IF NOT EXISTS document_chunks (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    source      TEXT NOT NULL,          -- ex: "BGFT - reglement fret interieur"
    content     TEXT NOT NULL,
    embedding   VECTOR(768),            -- Dimension pour nomic-embed-text d'Ollama
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks (tenant_id);
-- Index approximatif pour la recherche par similarité (à créer une fois un volume de données réel présent)
-- CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Table des documents de transport (métadonnées), consommée par le CRUD /documents.
-- Distincte de document_chunks (fragments vectorisés utilisés par le moteur RAG).
CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('Validé', 'À vérifier', 'À risque')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upload réel de fichier (MinIO) : ajouté après coup, en ALTER TABLE
-- idempotent plutôt qu'en modifiant la définition ci-dessus — permet
-- d'appliquer cette migration sur une base déjà initialisée sans perte de
-- données. storage_key = clé de l'objet dans MinIO, jamais exposée au
-- client (voir documents.Document.StorageKey côté Go). uploaded_by = email
-- de l'auteur, pour audit (traçabilité demandée par le CDC, gouvernance du
-- corpus).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name    TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size    BIGINT NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_key  TEXT NOT NULL DEFAULT '';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by  TEXT NOT NULL DEFAULT '';

--  FIX: Données de démonstration SUPPRIMÉES (créaient des doublons)
-- Les documents doivent être uploadés manuellement via l'interface web

-- Activation de l'index de similarité cosinus, maintenant qu'on va réellement
-- alimenter document_chunks (remplace le commentaire précédent laissé en placeholder).
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Historique des questions/réponses (EF-RAG-04, priorité Must). Alimente le
-- dashboard "Dernières questions" et permet l'audit des réponses fournies.
CREATE TABLE IF NOT EXISTS qa_history (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    user_email      TEXT NOT NULL,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    sources         TEXT[] NOT NULL DEFAULT '{}',
    best_similarity DOUBLE PRECISION,
    abstained       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_history_tenant_created
    ON qa_history (tenant_id, created_at DESC);


-- Utilisateurs et RBAC (CDC: Administrateur corpus, Responsable conformité,
-- Agent, Chargeur). Un seul mot de passe partagé n'est plus acceptable dès
-- que plusieurs profils métier coexistent.
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin_corpus', 'responsable_conformite', 'agent', 'chargeur')),
    full_name     TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);

-- Comptes de démo, un par rôle, tous avec le mot de passe Demo2026!
-- (hash bcrypt réel, jamais de mot de passe en clair en base).
INSERT INTO users (tenant_id, email, password_hash, role, full_name) VALUES
    ('BGFT', 'admin@bgft.cm', '$2b$10$t.nV8kqcp2VkvTgt.yIHoeA8bI3vYhjkhAR/MHwYyLWh0dBhyzZS2', 'admin_corpus', 'Administrateur Corpus'),
    ('BGFT', 'conformite@bgft.cm', '$2b$10$t.nV8kqcp2VkvTgt.yIHoeA8bI3vYhjkhAR/MHwYyLWh0dBhyzZS2', 'responsable_conformite', 'Responsable Conformité'),
    ('BGFT', 'agent@bgft.cm', '$2b$10$t.nV8kqcp2VkvTgt.yIHoeA8bI3vYhjkhAR/MHwYyLWh0dBhyzZS2', 'agent', 'Agent BGFT'),
    ('BGFT', 'chargeur@bgft.cm', '$2b$10$t.nV8kqcp2VkvTgt.yIHoeA8bI3vYhjkhAR/MHwYyLWh0dBhyzZS2', 'chargeur', 'Chargeur BGFT')
ON CONFLICT (email) DO NOTHING;
