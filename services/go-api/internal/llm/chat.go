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

// ChatClient génère une réponse en langage naturel à partir du contexte
// documentaire retrouvé par la recherche par similarité. Toute la logique
// d'abstention/citation est imposée ici via le system prompt, jamais laissée
// à l'appréciation libre du modèle.
type ChatClient interface {
	Answer(ctx context.Context, question, context string) (string, error)
}

type httpChatClient struct {
	apiURL string
	apiKey string
	model  string
	client *http.Client
}

func NewChatClient(apiURL, apiKey, model string) ChatClient {
	return &httpChatClient{
		apiURL: apiURL,
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

const systemPrompt = `Tu es l'assistant de conformité réglementaire fret de BoussoleFret IA.
Règles strictes et non négociables:
1. Réponds UNIQUEMENT à partir du contexte documentaire fourni ci-dessous.
2. Cite systématiquement la source (nom du document) de chaque affirmation.
3. Si le contexte ne permet pas de répondre avec certitude, dis explicitement
   que tu ne disposes pas d'une source suffisamment fiable et invite
   l'utilisateur à contacter le responsable conformité. Ne devine jamais.
4. Ne reformule jamais de mémoire une règle qui ne figure pas dans le contexte.`

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

// Answer appelle la passerelle LLM avec le contexte documentaire déjà filtré
// par similarité. Ne fait jamais confiance à une réponse vide.
func (c *httpChatClient) Answer(ctx context.Context, question, context string) (string, error) {
	userContent := fmt.Sprintf("Contexte documentaire:\n%s\n\nQuestion: %s", context, question)

	body, err := json.Marshal(chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
	})
	if err != nil {
		return "", fmt.Errorf("encodage requête chat: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("construction requête chat: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("appel API chat: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API chat a répondu %d: %s", resp.StatusCode, string(raw))
	}

	var parsed chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", fmt.Errorf("décodage réponse chat: %w", err)
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("réponse chat vide")
	}

	return parsed.Choices[0].Message.Content, nil
}
