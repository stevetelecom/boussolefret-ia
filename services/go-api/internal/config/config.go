package config

import (
	"log"
	"os"
)

// Config regroupe la configuration de l'application, chargée depuis les
// variables d'environnement (jamais de valeur secrète en dur dans le code).
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

// Load lit les variables d'environnement requises. Le programme s'arrête
// immédiatement si une variable obligatoire manque, plutôt que de démarrer
// dans un état invalide (ex: JWT_SECRET vide).
func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: mustGetEnv("DATABASE_URL"),
		JWTSecret:   mustGetEnv("JWT_SECRET"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("variable d'environnement obligatoire manquante: %s", key)
	}
	return v
}
