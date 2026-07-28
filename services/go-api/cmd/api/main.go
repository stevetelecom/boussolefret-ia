package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Doc struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

var (
	docs  = []Doc{{ID: 1, Name: "LVO_2026.pdf", Status: "Validé"}, {ID: 2, Name: "LVI_2026.pdf", Status: "À vérifier"}, {ID: 3, Name: "Mission_042.pdf", Status: "À risque"}}
	docMu sync.Mutex
)

func main() {
	router := gin.Default()
	router.Use(cors.New(cors.Config{AllowAllOrigins: true, AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}, AllowHeaders: []string{"Origin", "Content-Type", "Authorization"}}))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": "go-api", "status": "ok"})
	})

	// Auth (mock) with JWT
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" { jwtSecret = "dev-secret" }

	router.POST("/auth/login", func(c *gin.Context) {
		var req struct{
			Email string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid"})
			return
		}
		if req.Email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing email"})
			return
		}
		// create JWT
		claims := jwt.RegisteredClaims{
			Subject:   req.Email,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token_error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": signed})
	})

	// validate token endpoint
	router.GET("/auth/validate", func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
			return
		}
		// expect Bearer <token>
		var tok string
		if len(auth) > 7 && auth[:7] == "Bearer " {
			tok = auth[7:]
		} else {
			tok = auth
		}
		parsed, err := jwt.Parse(tok, func(t *jwt.Token) (any, error) { return []byte(jwtSecret), nil })
		if err != nil || !parsed.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
			return
		}
		c.JSON(http.StatusOK, gin.H{"valid": true})
	})

	// Documents CRUD
	router.GET("/documents", func(c *gin.Context) {
		docMu.Lock(); defer docMu.Unlock()
		c.JSON(http.StatusOK, docs)
	})

	router.POST("/documents", func(c *gin.Context) {
		var d Doc
		if err := c.BindJSON(&d); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}
		docMu.Lock()
		defer docMu.Unlock()
		next := 1
		for _, x := range docs { if x.ID >= next { next = x.ID + 1 } }
		d.ID = next
		docs = append(docs, d)
		c.JSON(http.StatusCreated, d)
	})

	router.PUT("/documents/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, _ := strconv.Atoi(idStr)
		var d Doc
		if err := c.BindJSON(&d); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"invalid"}); return }
		docMu.Lock()
		defer docMu.Unlock()
		for i := range docs { if docs[i].ID == id { docs[i].Name = d.Name; docs[i].Status = d.Status; c.JSON(http.StatusOK, docs[i]); return } }
		c.JSON(http.StatusNotFound, gin.H{"error":"not found"})
	})

	router.DELETE("/documents/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, _ := strconv.Atoi(idStr)
		docMu.Lock()
		defer docMu.Unlock()
		for i := range docs { if docs[i].ID == id { docs = append(docs[:i], docs[i+1:]...); c.JSON(http.StatusOK, gin.H{"ok": true}); return } }
		c.JSON(http.StatusNotFound, gin.H{"error":"not found"})
	})

	// Ask proxy to ai-service
	aiURL := os.Getenv("AI_SERVICE_URL")
	if aiURL == "" { aiURL = "http://ai-service:8000" }

	router.POST("/ask", func(c *gin.Context) {
		body, _ := io.ReadAll(c.Request.Body)
		// forward to ai-service
		resp, err := http.Post(aiURL+"/ask", "application/json", bytes.NewReader(body))
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "ai-service unreachable"})
			return
		}
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, "application/json", data)
	})

	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	log.Printf("go-api demarre sur le port %s", port)
	if err := router.Run(":" + port); err != nil { log.Fatal(err) }
}
