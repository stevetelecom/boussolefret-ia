package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const contextUserKey = "authUser"

// RequireJWT rejette toute requête sans jeton Bearer valide.
func RequireJWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "jeton d'authentification manquant"})
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")

		claims := &jwt.RegisteredClaims{}
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
		c.Next()
	}
}

func CurrentUser(c *gin.Context) string {
	v, _ := c.Get(contextUserKey)
	email, _ := v.(string)
	return email
}
