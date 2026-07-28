package documents

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("document introuvable")

// Repository encapsule tous les accès SQL liés aux documents. Chaque requête
// utilise des paramètres positionnels ($1, $2...) — jamais de concaténation
// de chaînes avec une valeur venant du client.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) List(ctx context.Context) ([]Document, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, status FROM documents ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("liste des documents: %w", err)
	}
	defer rows.Close()

	docs := make([]Document, 0)
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Name, &d.Status); err != nil {
			return nil, fmt.Errorf("lecture d'un document: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

func (r *Repository) Create(ctx context.Context, d Document) (Document, error) {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO documents (name, status) VALUES ($1, $2) RETURNING id`,
		d.Name, d.Status,
	).Scan(&d.ID)
	if err != nil {
		return Document{}, fmt.Errorf("création du document: %w", err)
	}
	return d, nil
}

func (r *Repository) Update(ctx context.Context, id int64, d Document) (Document, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE documents SET name = $1, status = $2 WHERE id = $3`,
		d.Name, d.Status, id,
	)
	if err != nil {
		return Document{}, fmt.Errorf("mise à jour du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Document{}, ErrNotFound
	}
	d.ID = id
	return d, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("suppression du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
EOFcat > services/go-api/internal/documents/repository.go << 'EOF'
package documents

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("document introuvable")

// Repository encapsule tous les accès SQL liés aux documents. Chaque requête
// utilise des paramètres positionnels ($1, $2...) — jamais de concaténation
// de chaînes avec une valeur venant du client.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) List(ctx context.Context) ([]Document, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, status FROM documents ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("liste des documents: %w", err)
	}
	defer rows.Close()

	docs := make([]Document, 0)
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Name, &d.Status); err != nil {
			return nil, fmt.Errorf("lecture d'un document: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

func (r *Repository) Create(ctx context.Context, d Document) (Document, error) {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO documents (name, status) VALUES ($1, $2) RETURNING id`,
		d.Name, d.Status,
	).Scan(&d.ID)
	if err != nil {
		return Document{}, fmt.Errorf("création du document: %w", err)
	}
	return d, nil
}

func (r *Repository) Update(ctx context.Context, id int64, d Document) (Document, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE documents SET name = $1, status = $2 WHERE id = $3`,
		d.Name, d.Status, id,
	)
	if err != nil {
		return Document{}, fmt.Errorf("mise à jour du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Document{}, ErrNotFound
	}
	d.ID = id
	return d, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("suppression du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
EOFcat > services/go-api/internal/documents/repository.go << 'EOF'
package documents

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("document introuvable")

// Repository encapsule tous les accès SQL liés aux documents. Chaque requête
// utilise des paramètres positionnels ($1, $2...) — jamais de concaténation
// de chaînes avec une valeur venant du client.
type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) List(ctx context.Context) ([]Document, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, status FROM documents ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("liste des documents: %w", err)
	}
	defer rows.Close()

	docs := make([]Document, 0)
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Name, &d.Status); err != nil {
			return nil, fmt.Errorf("lecture d'un document: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

func (r *Repository) Create(ctx context.Context, d Document) (Document, error) {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO documents (name, status) VALUES ($1, $2) RETURNING id`,
		d.Name, d.Status,
	).Scan(&d.ID)
	if err != nil {
		return Document{}, fmt.Errorf("création du document: %w", err)
	}
	return d, nil
}

func (r *Repository) Update(ctx context.Context, id int64, d Document) (Document, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE documents SET name = $1, status = $2 WHERE id = $3`,
		d.Name, d.Status, id,
	)
	if err != nil {
		return Document{}, fmt.Errorf("mise à jour du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Document{}, ErrNotFound
	}
	d.ID = id
	return d, nil
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("suppression du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
