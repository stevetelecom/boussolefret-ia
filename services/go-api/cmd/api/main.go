package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "go-api",
			"status":  "ok",
		})
	})

	// TODO: routes à venir
	// - /auth        (authentification, RBAC, multi-tenant)
	// - /documents   (upload -> stockage MinIO -> événement NATS "docs.ingested")
	// - /ask         (proxy vers ai-service pour une réponse RAG sourcée)
	// - /anomalies   (liste des documents signalés par ai-service)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("go-api demarre sur le port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
