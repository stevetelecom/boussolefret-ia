package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// IssueToken génère un jeton JWT signé pour un utilisateur donné.
//
// Centralisé ici plutôt que dupliqué dans chaque handler : /auth/login et
// PUT /me (changement d'email) ont tous les deux besoin d'émettre un jeton
// valide, et la logique de construction des claims ne doit exister qu'à un
// seul endroit pour éviter une divergence (ex: oubli d'un champ dans un des
// deux chemins).
func IssueToken(secret, email, role, tenantID string, ttl time.Duration) (string, error) {
	claims := Claims{
		Role:     role,
		TenantID: tenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
