package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	contextUserKey   = "authUser"
	contextRoleKey   = "authRole"
	contextTenantKey = "authTenant"
)

// Claims étend les claims JWT standard avec le rôle et le tenant de
// l'utilisateur — nécessaires pour le RBAC et l'isolation multi-tenant.
type Claims struct {
	Role     string `json:"role"`
	TenantID string `json:"tenant_id"`
	jwt.RegisteredClaims
}

// RequireJWT rejette toute requête sans jeton Bearer valide, et place
// l'email, le rôle et le tenant de l'utilisateur dans le contexte gin.
func RequireJWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "jeton d'authentification manquant"})
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "jeton invalide ou expiré"})
			return
		}

		c.Set(contextUserKey, claims.Subject)
		c.Set(contextRoleKey, claims.Role)
		c.Set(contextTenantKey, claims.TenantID)
		c.Next()
	}
}

// RequireRole n'autorise que les rôles listés. À utiliser après RequireJWT.
// Toute route sensible (ingestion corpus, écriture documents, historique)
// doit déclarer explicitement les rôles autorisés — jamais d'accès par défaut.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		role := CurrentRole(c)
		if !allowed[role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "rôle insuffisant pour cette action"})
			return
		}
		c.Next()
	}
}

func CurrentUser(c *gin.Context) string {
	v, _ := c.Get(contextUserKey)
	email, _ := v.(string)
	return email
}

func CurrentRole(c *gin.Context) string {
	v, _ := c.Get(contextRoleKey)
	role, _ := v.(string)
	return role
}

func CurrentTenant(c *gin.Context) string {
	v, _ := c.Get(contextTenantKey)
	tenant, _ := v.(string)
	return tenant
}
