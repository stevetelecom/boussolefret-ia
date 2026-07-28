package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/flysoft/boussolefret-ia/go-api/internal/config"
	"github.com/flysoft/boussolefret-ia/go-api/internal/corpus"
	"github.com/flysoft/boussolefret-ia/go-api/internal/db"
	"github.com/flysoft/boussolefret-ia/go-api/internal/documents"
	"github.com/flysoft/boussolefret-ia/go-api/internal/llm"
)

// tenantDefault : bureau pilote unique pour l'instant (Phase 1 du CDC).
// Sera remplacé par la résolution multi-tenant réelle (RBAC/JWT) en Phase 3.
const tenantDefault = "BGFT"

// topKChunks : nombre de fragments remontés par la recherche par similarité.
const topKChunks = 5

func main() {
	cfg := config.Load()

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connexion base de données impossible: %v", err)
	}
	defer pool.Close()

	docRepo := documents.NewRepository(pool)
	corpusRepo := corpus.NewRepository(pool)
	embeddingsClient := llm.NewEmbeddingsClient(cfg.LLMAPIURL, cfg.LLMAPIKey, cfg.EmbeddingsModel)
	chatClient := llm.NewChatClient(cfg.LLMAPIURL, cfg.LLMAPIKey, cfg.ChatModel)

	router := gin.Default()
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	router.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"service": "go-api", "status": "degraded", "db": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"service": "go-api", "status": "ok", "db": "up"})
	})

	router.POST("/auth/login", func(c *gin.Context) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		if req.Email == "" || req.Password == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "identifiants manquants"})
			return
		}
		if req.Password != "BoussoleFret2026!" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "identifiants invalides"})
			return
		}
		claims := jwt.RegisteredClaims{
			Subject:   req.Email,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, err := token.SignedString([]byte(cfg.JWTSecret))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur de génération du jeton"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": signed})
	})

	router.GET("/auth/validate", func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
			return
		}
		tok := strings.TrimPrefix(auth, "Bearer ")
		parsed, err := jwt.Parse(tok, func(t *jwt.Token) (any, error) { return []byte(cfg.JWTSecret), nil })
		if err != nil || !parsed.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
			return
		}
		c.JSON(http.StatusOK, gin.H{"valid": true})
	})

	router.GET("/documents", func(c *gin.Context) {
		docs, err := docRepo.List(c.Request.Context())
		if err != nil {
			log.Printf("erreur liste documents: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, docs)
	})

	router.POST("/documents", func(c *gin.Context) {
		var d documents.Document
		if err := c.BindJSON(&d); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		if err := d.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		created, err := docRepo.Create(c.Request.Context(), d)
		if err != nil {
			log.Printf("erreur création document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusCreated, created)
	})

	router.PUT("/documents/:id", func(c *gin.Context) {
		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "identifiant invalide"})
			return
		}
		var d documents.Document
		if err := c.BindJSON(&d); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		if err := d.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updated, err := docRepo.Update(c.Request.Context(), id, d)
		if errors.Is(err, documents.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur mise à jour document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, updated)
	})

	router.DELETE("/documents/:id", func(c *gin.Context) {
		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "identifiant invalide"})
			return
		}
		err = docRepo.Delete(c.Request.Context(), id)
		if errors.Is(err, documents.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur suppression document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// --- /ask : moteur RAG réel. Abstention obligatoire (EF-RAG-03) si la
	// meilleure similarité trouvée est sous le seuil configuré : on ne laisse
	// jamais le LLM répondre de mémoire sans source fiable.
	router.POST("/ask", func(c *gin.Context) {
		var req struct {
			Question string `json:"question"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		question := strings.TrimSpace(req.Question)
		if question == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "la question est obligatoire"})
			return
		}

		ctx := c.Request.Context()

		queryEmbedding, err := embeddingsClient.Embed(ctx, question)
		if err != nil {
			log.Printf("erreur embedding question: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		chunks, err := corpusRepo.SearchSimilar(ctx, tenantDefault, queryEmbedding, topKChunks)
		if err != nil {
			log.Printf("erreur recherche similarité: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		if len(chunks) == 0 || chunks[0].Similarity < cfg.SimilarityMin {
			c.JSON(http.StatusOK, gin.H{
				"answer":  "Je ne dispose pas d'une source suffisamment fiable dans le corpus pour répondre à cette question. Merci de contacter le responsable conformité.",
				"sources": []string{},
			})
			return
		}

		var contextBuilder strings.Builder
		sourcesSeen := make(map[string]bool)
		sources := make([]string, 0, len(chunks))
		for _, ch := range chunks {
			contextBuilder.WriteString("Source: " + ch.Source + "\n" + ch.Content + "\n\n")
			if !sourcesSeen[ch.Source] {
				sourcesSeen[ch.Source] = true
				sources = append(sources, ch.Source)
			}
		}

		answer, err := chatClient.Answer(ctx, question, contextBuilder.String())
		if err != nil {
			log.Printf("erreur génération réponse LLM: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"answer": answer, "sources": sources})
	})

	log.Printf("go-api démarre sur le port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
