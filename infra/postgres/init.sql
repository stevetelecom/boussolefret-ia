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
