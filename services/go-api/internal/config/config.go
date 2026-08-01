package config

import (
	"log"
	"os"
	"strconv"
	"time"
)

// Config regroupe la configuration de l'application, chargée depuis les
// variables d'environnement (jamais de valeur secrète en dur dans le code).
type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	LLMAPIURL       string
	LLMAPIKey       string
	EmbeddingsModel string
	ChatModel       string
	SimilarityMin   float64       // seuil d'abstention EF-RAG-03
	LLMTimeout      time.Duration // appels embeddings/chat vers Ollama (local, CPU)

	// Stockage objet (MinIO) pour les fichiers de documents transport.
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool
}

func Load() Config {
	return Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     mustGetEnv("DATABASE_URL"),
		JWTSecret:       mustGetEnv("JWT_SECRET"),
		LLMAPIURL:       mustGetEnv("LLM_API_URL"),
		LLMAPIKey:       mustGetEnv("LLM_API_KEY"),
		EmbeddingsModel: getEnv("EMBEDDINGS_MODEL", "text-embedding-3-small"),
		ChatModel:       getEnv("LLM_CHAT_MODEL", "gpt-4o-mini"),
		SimilarityMin:   getEnvFloat("SIMILARITY_MIN", 0.72),
		// 120s par défaut : un modèle Ollama local (CPU, sans GPU) peut mettre
		// plusieurs dizaines de secondes à charger en RAM au premier appel
		// après démarrage/pull — un timeout pensé pour une API cloud (15-30s)
		// déclenche des "context deadline exceeded" qui n'ont rien à voir
		// avec une vraie panne. Réglable via LLM_TIMEOUT_SECONDS si besoin.
		LLMTimeout: time.Duration(getEnvFloat("LLM_TIMEOUT_SECONDS", 120)) * time.Second,

		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: mustGetEnv("MINIO_ACCESS_KEY"),
		MinioSecretKey: mustGetEnv("MINIO_SECRET_KEY"),
		MinioBucket:    getEnv("MINIO_BUCKET", "boussolefret-documents"),
		MinioUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		log.Fatalf("variable %s invalide (nombre attendu): %v", key, err)
	}
	return f
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("variable d'environnement obligatoire manquante: %s", key)
	}
	return v
}
