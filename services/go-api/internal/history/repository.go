package history

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Entry représente une question posée et sa réponse, telles que persistées
// pour l'audit (EF-RAG-04) et pour alimenter le dashboard "Dernières questions".
type Entry struct {
	ID             int64     `json:"id"`
	Question       string    `json:"question"`
	Answer         string    `json:"answer"`
	Sources        []string  `json:"sources"`
	BestSimilarity *float64  `json:"best_similarity,omitempty"`
	Abstained      bool      `json:"abstained"`
	UserEmail      string    `json:"user_email"`
	CreatedAt      time.Time `json:"created_at"`
}

// Repository encapsule tous les accès SQL à qa_history. Requêtes 100%
// paramétrées, aucune concaténation de valeur venant du client.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Save persiste une question/réponse, qu'il y ait eu abstention ou non — on
// veut tracer les deux cas pour l'audit et pour mesurer le taux d'abstention.
func (r *Repository) Save(ctx context.Context, tenantID, userEmail, question, answer string, sources []string, bestSimilarity *float64, abstained bool) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO qa_history (tenant_id, user_email, question, answer, sources, best_similarity, abstained)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		tenantID, userEmail, question, answer, sources, bestSimilarity, abstained,
	)
	if err != nil {
		return fmt.Errorf("sauvegarde historique Q/R: %w", err)
	}
	return nil
}

// ListRecent retourne les dernières questions posées pour un tenant, les plus
// récentes en premier — consommé par le dashboard et l'écran d'historique.
func (r *Repository) ListRecent(ctx context.Context, tenantID string, limit int) ([]Entry, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, question, answer, sources, best_similarity, abstained, user_email, created_at
		 FROM qa_history
		 WHERE tenant_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2`,
		tenantID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("liste historique Q/R: %w", err)
	}
	defer rows.Close()

	entries := make([]Entry, 0, limit)
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.Question, &e.Answer, &e.Sources, &e.BestSimilarity, &e.Abstained, &e.UserEmail, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("lecture entrée historique: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
