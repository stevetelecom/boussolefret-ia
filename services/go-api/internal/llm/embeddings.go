package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// EmbeddingsClient est l'interface utilisée par le reste de l'application.
// Toute logique métier dépend de cette interface, jamais d'un client HTTP
// concret — la passerelle LLM reste interchangeable.
type EmbeddingsClient interface {
	Embed(ctx context.Context, text string) ([]float32, error)
}

type httpEmbeddingsClient struct {
	apiURL string
	apiKey string
	model  string
	client *http.Client
}

func NewEmbeddingsClient(apiURL, apiKey, model string) EmbeddingsClient {
	return &httpEmbeddingsClient{
		apiURL: apiURL,
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

type embeddingsRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

type embeddingsResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

// Embed vectorise un texte via la passerelle LLM. On ne fait jamais confiance
// à une réponse vide ou malformée : erreur explicite plutôt que de laisser
// passer un embedding invalide en base.
func (c *httpEmbeddingsClient) Embed(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("texte vide: impossible de générer un embedding")
	}

	body, err := json.Marshal(embeddingsRequest{Model: c.model, Input: text})
	if err != nil {
		return nil, fmt.Errorf("encodage requête embeddings: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiURL+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("construction requête embeddings: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("appel API embeddings: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API embeddings a répondu %d: %s", resp.StatusCode, string(raw))
	}

	var parsed embeddingsResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("décodage réponse embeddings: %w", err)
	}
	if len(parsed.Data) == 0 || len(parsed.Data[0].Embedding) == 0 {
		return nil, fmt.Errorf("réponse embeddings vide ou invalide")
	}

	return parsed.Data[0].Embedding, nil
}
