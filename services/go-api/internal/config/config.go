package config

import (
	"log"
	"os"
	"strconv"
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
	SimilarityMin   float64 // seuil d'abstention EF-RAG-03
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
