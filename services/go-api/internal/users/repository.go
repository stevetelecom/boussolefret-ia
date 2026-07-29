package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Rôles métier définis par le CDC. Toute route protégée par rôle doit
// utiliser ces constantes, jamais une chaîne libre.
const (
	RoleAdminCorpus           = "admin_corpus"
	RoleResponsableConformite = "responsable_conformite"
	RoleAgent                 = "agent"
	RoleChargeur              = "chargeur"
)

var ErrNotFound = errors.New("utilisateur introuvable")

// User est l'entité persistée en base. PasswordHash n'est jamais exposé en
// JSON (pas de tag json) — il ne doit jamais quitter le backend.
type User struct {
	ID           int64
	TenantID     string
	Email        string
	PasswordHash string
	Role         string
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByEmail retourne l'utilisateur correspondant, ou ErrNotFound. Requête
// paramétrée, aucune concaténation de valeur venant du client.
func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("recherche utilisateur: %w", err)
	}
	return &u, nil
}
