package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	authmw "github.com/flysoft/boussolefret-ia/go-api/internal/auth"
	"github.com/flysoft/boussolefret-ia/go-api/internal/config"
	"github.com/flysoft/boussolefret-ia/go-api/internal/corpus"
	"github.com/flysoft/boussolefret-ia/go-api/internal/db"
	"github.com/flysoft/boussolefret-ia/go-api/internal/documents"
	"github.com/flysoft/boussolefret-ia/go-api/internal/history"
	"github.com/flysoft/boussolefret-ia/go-api/internal/ingest"
	"github.com/flysoft/boussolefret-ia/go-api/internal/llm"
	"github.com/flysoft/boussolefret-ia/go-api/internal/storage"
	"github.com/flysoft/boussolefret-ia/go-api/internal/users"
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

const tenantDefault = "BGFT"
const topKChunks = 5
const chunkMaxRunes = 1500
const chunkOverlap = 200
const maxIngestBytes = 2_000_000
const historyDefaultLimit = 20
const authTokenTTL = 24 * time.Hour

// Fichiers de documents transport : mêmes garde-fous que n'importe quel
// upload utilisateur — taille plafonnée et whitelist stricte d'extensions
// (jamais de blacklist, toujours plus facile à contourner).
const maxDocumentUploadBytes = 20 << 20 // 20 Mo

var allowedDocumentExtensions = map[string]bool{
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".xls":  true,
	".xlsx": true,
	".jpg":  true,
	".jpeg": true,
	".png":  true,
}

func main() {
	cfg := config.Load()

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connexion base de données impossible: %v", err)
	}
	defer pool.Close()

	minioClient, err := storage.NewClient(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioBucket, cfg.MinioUseSSL)
	if err != nil {
		log.Fatalf("connexion MinIO impossible: %v", err)
	}
	{
		initCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := minioClient.EnsureBucket(initCtx); err != nil {
			log.Printf("avertissement: bucket MinIO indisponible au démarrage (%v) -- upload de documents indisponible tant que MinIO n'est pas joignable, le reste de l'API démarre normalement", err)
		}
		cancel()
	}

	docRepo := documents.NewRepository(pool)
	corpusRepo := corpus.NewRepository(pool)
	historyRepo := history.NewRepository(pool)
	usersRepo := users.NewRepository(pool)
	embeddingsClient := llm.NewEmbeddingsClient(cfg.LLMAPIURL, cfg.LLMAPIKey, cfg.EmbeddingsModel)
	chatClient := llm.NewChatClient(cfg.LLMAPIURL, cfg.LLMAPIKey, cfg.ChatModel)

	router := gin.Default()
	router.MaxMultipartMemory = 8 << 20 // 8 Mo gardés en mémoire ; au-delà, Gin bascule sur fichier temporaire disque
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

		user, err := usersRepo.FindByEmail(c.Request.Context(), req.Email)
		if errors.Is(err, users.ErrNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "identifiants invalides"})
			return
		}
		if err != nil {
			log.Printf("erreur recherche utilisateur: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "identifiants invalides"})
			return
		}

		signed, err := authmw.IssueToken(cfg.JWTSecret, user.Email, user.Role, user.TenantID, authTokenTTL)
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

	protected := router.Group("/")
	protected.Use(authmw.RequireJWT(cfg.JWTSecret))

	// Écriture documents + historique + gouvernance corpus : réservées aux
	// profils responsables (le CDC exclut Agent/Chargeur de ces actions).
	conformite := protected.Group("/")
	conformite.Use(authmw.RequireRole(users.RoleAdminCorpus, users.RoleResponsableConformite))

	// Ingestion du corpus réglementaire : rôle Administrateur corpus uniquement.
	corpusAdmin := protected.Group("/")
	corpusAdmin.Use(authmw.RequireRole(users.RoleAdminCorpus))

	protected.GET("/documents", func(c *gin.Context) {
		docs, err := docRepo.List(c.Request.Context())
		if err != nil {
			log.Printf("erreur liste documents: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, docs)
	})

	// Création d'un document AVEC son fichier physique. multipart/form-data
	// obligatoire (jamais JSON ici) : champs "name", "status", "file".
	// Le fichier est streamé directement vers MinIO, jamais écrit sur le
	// disque local du conteneur go-api.
	conformite.POST("/documents", func(c *gin.Context) {
		name := strings.TrimSpace(c.PostForm("name"))
		status := c.PostForm("status")

		fileHeader, ferr := c.FormFile("file")
		if ferr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "le fichier est obligatoire"})
			return
		}
		if name == "" {
			name = fileHeader.Filename
		}

		d := documents.Document{Name: name, Status: status}
		if err := d.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		objectKey, contentType, err := uploadDocumentFile(c.Request.Context(), minioClient, fileHeader)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		d.FileName = fileHeader.Filename
		d.FileSize = fileHeader.Size
		d.ContentType = contentType
		d.StorageKey = objectKey

		created, err := docRepo.Create(c.Request.Context(), d, authmw.CurrentUser(c))
		if err != nil {
			// La ligne BD n'a pas pu être créée : on ne laisse pas un fichier
			// orphelin dans MinIO derrière nous.
			if delErr := minioClient.Delete(c.Request.Context(), objectKey); delErr != nil {
				log.Printf("erreur nettoyage MinIO après échec création document: %v", delErr)
			}
			log.Printf("erreur création document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusCreated, created)
	})

	// Mise à jour d'un document. Le fichier ("file") est optionnel : si
	// absent, on garde le fichier déjà associé ; s'il est présent, il
	// remplace l'ancien (l'ancien objet MinIO est supprimé après succès).
	conformite.PUT("/documents/:id", func(c *gin.Context) {
		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "identifiant invalide"})
			return
		}

		existing, err := docRepo.Get(c.Request.Context(), id)
		if errors.Is(err, documents.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur lecture document avant mise à jour: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		name := strings.TrimSpace(c.PostForm("name"))
		status := c.PostForm("status")
		d := documents.Document{
			Name:        name,
			Status:      status,
			FileName:    existing.FileName,
			FileSize:    existing.FileSize,
			ContentType: existing.ContentType,
			StorageKey:  existing.StorageKey,
		}
		if err := d.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		replacingFile := false
		oldStorageKey := existing.StorageKey
		if fileHeader, ferr := c.FormFile("file"); ferr == nil {
			objectKey, contentType, err := uploadDocumentFile(c.Request.Context(), minioClient, fileHeader)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			d.FileName = fileHeader.Filename
			d.FileSize = fileHeader.Size
			d.ContentType = contentType
			d.StorageKey = objectKey
			replacingFile = true
		}

		updated, err := docRepo.Update(c.Request.Context(), id, d)
		if errors.Is(err, documents.ErrNotFound) {
			if replacingFile {
				_ = minioClient.Delete(c.Request.Context(), d.StorageKey)
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			if replacingFile {
				_ = minioClient.Delete(c.Request.Context(), d.StorageKey)
			}
			log.Printf("erreur mise à jour document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		if replacingFile && oldStorageKey != "" {
			if err := minioClient.Delete(c.Request.Context(), oldStorageKey); err != nil {
				log.Printf("erreur suppression ancien fichier MinIO (document %d): %v", id, err)
			}
		}
		c.JSON(http.StatusOK, updated)
	})

	conformite.DELETE("/documents/:id", func(c *gin.Context) {
		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "identifiant invalide"})
			return
		}
		storageKey, err := docRepo.Delete(c.Request.Context(), id)
		if errors.Is(err, documents.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur suppression document: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		if storageKey != "" {
			if err := minioClient.Delete(c.Request.Context(), storageKey); err != nil {
				// La ligne BD est déjà supprimée : on log sans bloquer la
				// réponse. Un fichier orphelin en cas d'incident MinIO est un
				// moindre mal comparé à une suppression bloquée pour l'utilisateur.
				log.Printf("erreur suppression fichier MinIO (document %d, clé %s): %v", id, storageKey, err)
			}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Lien de téléchargement présigné. Le fichier n'est JAMAIS servi
	// directement par go-api ni exposé publiquement sur MinIO : cette route
	// passe par le RBAC standard (n'importe quel rôle authentifié, comme la
	// lecture de /documents) avant de générer un lien à courte durée de vie.
	protected.GET("/documents/:id/download", func(c *gin.Context) {
		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "identifiant invalide"})
			return
		}
		doc, err := docRepo.Get(c.Request.Context(), id)
		if errors.Is(err, documents.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur lecture document (téléchargement): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		if doc.StorageKey == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "aucun fichier associé à ce document"})
			return
		}
		url, err := minioClient.PresignedDownloadURL(c.Request.Context(), doc.StorageKey, doc.FileName)
		if err != nil {
			log.Printf("erreur génération lien de téléchargement (document %d): %v", id, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"url": url})
	})

	corpusAdmin.GET("/corpus", func(c *gin.Context) {
		sources, err := corpusRepo.ListSources(c.Request.Context(), tenantDefault)
		if err != nil {
			log.Printf("erreur liste sources corpus: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, sources)
	})

	corpusAdmin.POST("/corpus", func(c *gin.Context) {
		var req struct {
			Source  string `json:"source"`
			Content string `json:"content"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		source := strings.TrimSpace(req.Source)
		content := strings.TrimSpace(req.Content)
		if source == "" || content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "source et content sont obligatoires"})
			return
		}
		if len(content) > maxIngestBytes {
			c.JSON(http.StatusBadRequest, gin.H{"error": "contenu trop volumineux"})
			return
		}

		ctx := c.Request.Context()
		chunks := corpus.SplitIntoChunks(content, chunkMaxRunes, chunkOverlap)
		inserted := 0
		for _, chunk := range chunks {
			embedding, err := embeddingsClient.Embed(ctx, chunk)
			if err != nil {
				log.Printf("erreur embedding chunk (%s): %v", source, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "échec d'indexation en cours de traitement", "inserted": inserted, "total": len(chunks),
				})
				return
			}
			if err := corpusRepo.Insert(ctx, tenantDefault, source, chunk, embedding); err != nil {
				log.Printf("erreur insertion chunk (%s): %v", source, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "échec d'indexation en cours de traitement", "inserted": inserted, "total": len(chunks),
				})
				return
			}
			inserted++
		}

		log.Printf("corpus ingéré: source=%s chunks=%d par=%s", source, inserted, authmw.CurrentUser(c))
		c.JSON(http.StatusCreated, gin.H{"source": source, "chunks_indexed": inserted})
	})

	protected.POST("/ask", func(c *gin.Context) {
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
			abstainAnswer := "Je ne dispose pas d'une source suffisamment fiable dans le corpus pour répondre à cette question. Merci de contacter le responsable conformité."
			var bestSim *float64
			if len(chunks) > 0 {
				bestSim = &chunks[0].Similarity
			}
			if err := historyRepo.Save(ctx, tenantDefault, authmw.CurrentUser(c), question, abstainAnswer, []string{}, bestSim, true); err != nil {
				log.Printf("erreur sauvegarde historique (abstention): %v", err)
			}
			c.JSON(http.StatusOK, gin.H{
				"answer":  abstainAnswer,
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

		bestSim := chunks[0].Similarity
		if err := historyRepo.Save(ctx, tenantDefault, authmw.CurrentUser(c), question, answer, sources, &bestSim, false); err != nil {
			log.Printf("erreur sauvegarde historique: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"answer": answer, "sources": sources})
	})

	conformite.GET("/history", func(c *gin.Context) {
		limit := historyDefaultLimit
		if raw := c.Query("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}
		entries, err := historyRepo.ListRecent(c.Request.Context(), tenantDefault, limit)
		if err != nil {
			log.Printf("erreur liste historique: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, entries)
	})

	// Profil du compte connecté (n'importe quel rôle authentifié peut
	// consulter/modifier SON PROPRE profil — ce n'est pas une route
	// d'administration des comptes tiers).
	protected.GET("/me", func(c *gin.Context) {
		user, err := usersRepo.FindByEmail(c.Request.Context(), authmw.CurrentUser(c))
		if errors.Is(err, users.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "utilisateur introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur lecture profil: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"full_name": user.FullName,
			"phone":     user.Phone,
			"role":      user.Role,
			"tenant_id": user.TenantID,
		})
	})

	protected.PUT("/me", func(c *gin.Context) {
		var req struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
			Phone    string `json:"phone"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		fullName := strings.TrimSpace(req.FullName)
		newEmail := strings.TrimSpace(strings.ToLower(req.Email))
		phone := strings.TrimSpace(req.Phone)
		if fullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "le nom complet est obligatoire"})
			return
		}
		if !emailPattern.MatchString(newEmail) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email invalide"})
			return
		}

		currentEmail := authmw.CurrentUser(c)
		updated, err := usersRepo.UpdateProfile(c.Request.Context(), currentEmail, fullName, newEmail, phone)
		if errors.Is(err, users.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "cet email est déjà utilisé"})
			return
		}
		if errors.Is(err, users.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "utilisateur introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur mise à jour profil: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}

		resp := gin.H{
			"id":        updated.ID,
			"email":     updated.Email,
			"full_name": updated.FullName,
			"phone":     updated.Phone,
			"role":      updated.Role,
			"tenant_id": updated.TenantID,
		}
		if newEmail != currentEmail {
			// Le JWT porte l'email en Subject : s'il change, l'ancien jeton
			// référence un compte qui n'existe plus sous ce nom — on en
			// réémet un immédiatement pour ne pas déconnecter l'utilisateur.
			newToken, err := authmw.IssueToken(cfg.JWTSecret, updated.Email, updated.Role, updated.TenantID, authTokenTTL)
			if err != nil {
				log.Printf("erreur réémission jeton après changement email: %v", err)
			} else {
				resp["token"] = newToken
			}
		}
		c.JSON(http.StatusOK, resp)
	})

	protected.PUT("/me/password", func(c *gin.Context) {
		var req struct {
			CurrentPassword string `json:"current_password"`
			NewPassword     string `json:"new_password"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalide"})
			return
		}
		if len(req.NewPassword) < 8 {
			// Revalidé côté serveur : ne jamais faire confiance à la seule
			// validation du formulaire Angular.
			c.JSON(http.StatusBadRequest, gin.H{"error": "le nouveau mot de passe doit contenir au moins 8 caractères"})
			return
		}

		email := authmw.CurrentUser(c)
		user, err := usersRepo.FindByEmail(c.Request.Context(), email)
		if errors.Is(err, users.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "utilisateur introuvable"})
			return
		}
		if err != nil {
			log.Printf("erreur lecture utilisateur (changement mdp): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "mot de passe actuel incorrect"})
			return
		}

		newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("erreur hachage nouveau mot de passe: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		if err := usersRepo.UpdatePassword(c.Request.Context(), email, string(newHash)); err != nil {
			log.Printf("erreur mise à jour mot de passe: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur serveur"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	log.Printf("go-api démarre sur le port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

// uploadDocumentFile valide (taille, extension whitelist) puis envoie un
// fichier reçu en multipart vers MinIO sous une clé générée côté serveur.
// Centralisé ici car utilisé identiquement par la création et le
// remplacement de fichier d'un document.
func uploadDocumentFile(ctx context.Context, minioClient *storage.Client, fileHeader *multipart.FileHeader) (objectKey string, contentType string, err error) {
	if fileHeader.Size > maxDocumentUploadBytes {
		return "", "", errors.New("fichier trop volumineux (20 Mo maximum)")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedDocumentExtensions[ext] {
		return "", "", errors.New("type de fichier non autorisé (formats acceptés : pdf, doc, docx, xls, xlsx, jpg, png)")
	}

	objectKey, err = newObjectKey(ext)
	if err != nil {
		return "", "", errors.New("erreur interne lors de la préparation du fichier")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return "", "", errors.New("lecture du fichier envoyé impossible")
	}
	defer src.Close()

	contentType = fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if err := minioClient.Upload(ctx, objectKey, src, fileHeader.Size, contentType); err != nil {
		log.Printf("erreur upload MinIO (%s): %v", fileHeader.Filename, err)
		return "", "", errors.New("échec de l'envoi du fichier vers le stockage")
	}

	return objectKey, contentType, nil
}

// newObjectKey génère une clé d'objet MinIO aléatoire et imprévisible
// newObjectKey génère une clé d'objet MinIO aléatoire et imprévisible
// (16 octets issus de crypto/rand), jamais dérivée du nom de fichier fourni
// par le client — élimine tout risque de traversée de chemin ou de collision
// avec un objet existant. Préfixée par le tenant pour préparer l'isolation
// multi-bureau prévue en Phase 3 (2ᵉ bureau BNFT).
func newObjectKey(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return tenantDefault + "/" + hex.EncodeToString(buf) + ext, nil
}
