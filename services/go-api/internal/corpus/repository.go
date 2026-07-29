package corpus

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Chunk est un fragment du corpus réglementaire retourné par une recherche
// par similarité, avec son score (1 = identique, 0 = aucun rapport).
type Chunk struct {
	Source     string
	Content    string
	Similarity float64
}

// Repository encapsule tous les accès SQL à document_chunks. Requêtes 100%
// paramétrées, aucune concaténation de valeur venant du client.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// vectorLiteral convertit un embedding Go en littéral pgvector "[0.1,0.2,...]".
// pgvector attend ce format texte, casté côté SQL avec ::vector.
func vectorLiteral(embedding []float32) string {
	parts := make([]string, len(embedding))
	for i, v := range embedding {
		parts[i] = strconv.FormatFloat(float64(v), 'f', 8, 32)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

// Insert ajoute un fragment vectorisé pour un tenant donné (isolation stricte
// multi-tenant : chaque requête de recherche doit filtrer par tenant_id).
func (r *Repository) Insert(ctx context.Context, tenantID, source, content string, embedding []float32) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO document_chunks (tenant_id, source, content, embedding)
		 VALUES ($1, $2, $3, $4::vector)`,
		tenantID, source, content, vectorLiteral(embedding),
	)
	if err != nil {
		return fmt.Errorf("insertion chunk: %w", err)
	}
	return nil
}

// SearchSimilar retourne les topK fragments les plus proches de l'embedding
// de la question, restreints au tenant donné (isolation multi-tenant EF-*).
// La similarité cosinus est dérivée de l'opérateur pgvector <=> (distance).
func (r *Repository) SearchSimilar(ctx context.Context, tenantID string, embedding []float32, topK int) ([]Chunk, error) {
	lit := vectorLiteral(embedding)
	rows, err := r.pool.Query(ctx,
		`SELECT source, content, 1 - (embedding <=> $2::vector) AS similarity
		 FROM document_chunks
		 WHERE tenant_id = $1
		 ORDER BY embedding <=> $2::vector
		 LIMIT $3`,
		tenantID, lit, topK,
	)
	if err != nil {
		return nil, fmt.Errorf("recherche par similarité: %w", err)
	}
	defer rows.Close()

	results := make([]Chunk, 0, topK)
	for rows.Next() {
		var c Chunk
		if err := rows.Scan(&c.Source, &c.Content, &c.Similarity); err != nil {
			return nil, fmt.Errorf("lecture résultat similarité: %w", err)
		}
		results = append(results, c)
	}
	return results, rows.Err()
}

// SourceSummary résume le corpus indexé pour l'écran "Voir les sources".
type SourceSummary struct {
	Source string `json:"source"`
	Chunks int    `json:"chunks"`
}

// ListSources retourne, par tenant, chaque document source ingéré et son
// nombre de fragments indexés — utilisé par le front pour afficher ce qui
// alimente réellement le moteur RAG.
func (r *Repository) ListSources(ctx context.Context, tenantID string) ([]SourceSummary, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT source, COUNT(*) FROM document_chunks WHERE tenant_id = $1 GROUP BY source ORDER BY source`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("liste des sources: %w", err)
	}
	defer rows.Close()

	sources := make([]SourceSummary, 0)
	for rows.Next() {
		var s SourceSummary
		if err := rows.Scan(&s.Source, &s.Chunks); err != nil {
			return nil, fmt.Errorf("lecture source: %w", err)
		}
		sources = append(sources, s)
	}
	return sources, rows.Err()
}

// SourceSummary résume le corpus indexé pour l'écran "Voir les sources".
type SourceSummary struct {
	Source string `json:"source"`
	Chunks int    `json:"chunks"`
}

// ListSources retourne, par tenant, chaque document source ingéré et son
// nombre de fragments indexés.
func (r *Repository) ListSources(ctx context.Context, tenantID string) ([]SourceSummary, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT source, COUNT(*) FROM document_chunks WHERE tenant_id = $1 GROUP BY source ORDER BY source`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("liste des sources: %w", err)
	}
	defer rows.Close()

	sources := make([]SourceSummary, 0)
	for rows.Next() {
		var s SourceSummary
		if err := rows.Scan(&s.Source, &s.Chunks); err != nil {
			return nil, fmt.Errorf("lecture source: %w", err)
		}
		sources = append(sources, s)
	}
	return sources, rows.Err()
}
