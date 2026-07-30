package documents

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
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

func scanDocument(row pgx.Row) (Document, error) {
	var d Document
	if err := row.Scan(&d.ID, &d.Name, &d.Status, &d.FileName, &d.FileSize, &d.ContentType, &d.StorageKey); err != nil {
		return Document{}, err
	}
	d.HasFile = d.StorageKey != ""
	return d, nil
}

func (r *Repository) List(ctx context.Context) ([]Document, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, status, file_name, file_size, content_type, storage_key
		 FROM documents ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("liste des documents: %w", err)
	}
	defer rows.Close()

	docs := make([]Document, 0)
	for rows.Next() {
		d, err := scanDocument(rows)
		if err != nil {
			return nil, fmt.Errorf("lecture d'un document: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

// Get récupère un document par id, StorageKey inclus. Utilisé en interne
// (téléchargement, remplacement de fichier) — jamais renvoyé tel quel au
// client, qui ne doit voir la StorageKey en aucun cas (voir Document.StorageKey).
func (r *Repository) Get(ctx context.Context, id int64) (Document, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, name, status, file_name, file_size, content_type, storage_key
		 FROM documents WHERE id = $1`, id)
	d, err := scanDocument(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Document{}, ErrNotFound
	}
	if err != nil {
		return Document{}, fmt.Errorf("lecture du document %d: %w", id, err)
	}
	return d, nil
}

func (r *Repository) Create(ctx context.Context, d Document, uploadedBy string) (Document, error) {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO documents (name, status, file_name, file_size, content_type, storage_key, uploaded_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		d.Name, d.Status, d.FileName, d.FileSize, d.ContentType, d.StorageKey, uploadedBy,
	).Scan(&d.ID)
	if err != nil {
		return Document{}, fmt.Errorf("création du document: %w", err)
	}
	d.HasFile = d.StorageKey != ""
	return d, nil
}

func (r *Repository) Update(ctx context.Context, id int64, d Document) (Document, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE documents
		 SET name = $1, status = $2, file_name = $3, file_size = $4, content_type = $5, storage_key = $6
		 WHERE id = $7`,
		d.Name, d.Status, d.FileName, d.FileSize, d.ContentType, d.StorageKey, id,
	)
	if err != nil {
		return Document{}, fmt.Errorf("mise à jour du document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Document{}, ErrNotFound
	}
	d.ID = id
	d.HasFile = d.StorageKey != ""
	return d, nil
}

// Delete supprime la ligne et renvoie la StorageKey qu'elle référençait, pour
// que l'appelant puisse ensuite supprimer l'objet MinIO correspondant.
// StorageKey vide ("") signifie "aucun fichier à supprimer côté stockage".
func (r *Repository) Delete(ctx context.Context, id int64) (string, error) {
	var storageKey string
	err := r.pool.QueryRow(ctx, `DELETE FROM documents WHERE id = $1 RETURNING storage_key`, id).Scan(&storageKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("suppression du document: %w", err)
	}
	return storageKey, nil
}
