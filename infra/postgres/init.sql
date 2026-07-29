-- Activation de l'extension vectorielle
CREATE EXTENSION IF NOT EXISTS vector;

-- Table de base pour les segments de documents indexés (embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    source      TEXT NOT NULL,          -- ex: "BGFT - reglement fret interieur"
    content     TEXT NOT NULL,
    embedding   VECTOR(1536),           -- ajuster la dimension selon le modèle d'embeddings choisi
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

-- Données de démonstration (reprend les 3 documents précédemment codés en dur dans go-api)
INSERT INTO documents (name, status) VALUES
    ('LVO_2026.pdf', 'Validé'),
    ('LVI_2026.pdf', 'À vérifier'),
    ('Mission_042.pdf', 'À risque');

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
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);

-- Comptes de démo, un par rôle, tous avec le mot de passe BoussoleFret2026!
-- (hash bcrypt réel, jamais de mot de passe en clair en base).
INSERT INTO users (tenant_id, email, password_hash, role) VALUES
    ('BGFT', 'admin@bgft.cm', '$2b$10$rR.UlRj743q8CMRWMIUh7u/J4bClChsThVvWkEKfC7XYTj2UDgkAO', 'admin_corpus'),
    ('BGFT', 'conformite@bgft.cm', '$2b$10$faCvQBJApb/XTEo3XPz3MOmFFAHwRT13SRGotmBzNhn6pm72H0A..', 'responsable_conformite'),
    ('BGFT', 'agent@bgft.cm', '$2b$10$26D4XvEV2csfjBd6tnmcQuP/yHdtKEvW6.evoWwbp9R4BuUDJc4AS', 'agent'),
    ('BGFT', 'chargeur@bgft.cm', '$2b$10$wGZIUw4ZpoSwYGPb.ZKMVu0uGihD0Uv4oohgCD8IvMmhjxWNtVvu.', 'chargeur')
ON CONFLICT (email) DO NOTHING;
