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
