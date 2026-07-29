package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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
var ErrEmailTaken = errors.New("cet email est déjà utilisé")

// User est l'entité persistée en base. PasswordHash n'est jamais exposé en
// JSON (pas de tag json) — il ne doit jamais quitter le backend.
type User struct {
	ID           int64
	TenantID     string
	Email        string
	PasswordHash string
	Role         string
	FullName     string
	Phone        string
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
		`SELECT id, tenant_id, email, password_hash, role, full_name, phone FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.Role, &u.FullName, &u.Phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("recherche utilisateur: %w", err)
	}
	return &u, nil
}

// UpdateProfile modifie nom/email/téléphone d'un utilisateur identifié par
// son email courant. La contrainte UNIQUE sur email est laissée à
// PostgreSQL (pas de vérification préalable en 2 temps, sujette à une
// condition de course) — on traduit juste sa violation en ErrEmailTaken.
func (r *Repository) UpdateProfile(ctx context.Context, currentEmail, fullName, newEmail, phone string) (*User, error) {
	var u User
	err := r.pool.QueryRow(ctx,
		`UPDATE users SET full_name = $1, email = $2, phone = $3
		 WHERE email = $4
		 RETURNING id, tenant_id, email, password_hash, role, full_name, phone`,
		fullName, newEmail, phone, currentEmail,
	).Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.Role, &u.FullName, &u.Phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return nil, ErrEmailTaken
	}
	if err != nil {
		return nil, fmt.Errorf("mise à jour profil: %w", err)
	}
	return &u, nil
}

// UpdatePassword remplace le hash bcrypt stocké. L'appelant doit avoir
// vérifié l'ancien mot de passe et haché le nouveau AVANT d'appeler cette
// méthode — ce repository ne fait volontairement aucun hachage lui-même.
func (r *Repository) UpdatePassword(ctx context.Context, email, newHash string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE email = $2`, newHash, email)
	if err != nil {
		return fmt.Errorf("mise à jour mot de passe: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
