package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect ouvre un pool de connexions vers PostgreSQL avec plusieurs tentatives:
// go-api peut démarrer avant que le conteneur postgres soit prêt à accepter
// des connexions, même avec depends_on + healthcheck dans docker-compose.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error

	for attempt := 1; attempt <= 10; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		pool, err = pgxpool.New(ctx, databaseURL)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				cancel()
				log.Println("connexion PostgreSQL établie")
				return pool, nil
			} else {
				err = pingErr
			}
		}
		cancel()
		log.Printf("tentative %d/10 de connexion à PostgreSQL échouée: %v", attempt, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("connexion PostgreSQL impossible après plusieurs tentatives: %w", err)
}
