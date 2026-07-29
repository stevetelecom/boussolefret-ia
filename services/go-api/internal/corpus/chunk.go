package corpus

import "strings"

// SplitIntoChunks découpe un texte en fragments d'au plus maxRunes caractères,
// avec un recouvrement (overlap) entre fragments consécutifs.
func SplitIntoChunks(text string, maxRunes, overlap int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	runes := []rune(text)
	if len(runes) <= maxRunes {
		return []string{text}
	}

	var chunks []string
	start := 0
	for start < len(runes) {
		end := start + maxRunes
		if end > len(runes) {
			end = len(runes)
		}
		chunk := strings.TrimSpace(string(runes[start:end]))
		if chunk != "" {
			chunks = append(chunks, chunk)
		}
		if end == len(runes) {
			break
		}
		start = end - overlap
		if start < 0 {
			start = 0
		}
	}
	return chunks
}
