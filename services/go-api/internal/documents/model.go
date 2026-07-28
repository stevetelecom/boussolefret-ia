package documents

import (
	"errors"
	"strings"
)

// Status représente les statuts métier valides. Whitelist stricte plutôt
// qu'une chaîne libre, pour ne jamais persister une valeur incohérente
// envoyée par le client.
type Status string

const (
	StatusValide    Status = "Validé"
	StatusAVerifier Status = "À vérifier"
	StatusARisque   Status = "À risque"
)

func (s Status) Valid() bool {
	switch s {
	case StatusValide, StatusAVerifier, StatusARisque:
		return true
	default:
		return false
	}
}

// Document est l'entité métier persistée en base.
type Document struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

// Validate applique les règles de validation d'entrée: on ne fait jamais
// confiance aux données envoyées par le client.
func (d Document) Validate() error {
	name := strings.TrimSpace(d.Name)
	if name == "" {
		return errors.New("le nom du document est obligatoire")
	}
	if len(name) > 255 {
		return errors.New("le nom du document dépasse 255 caractères")
	}
	if !Status(d.Status).Valid() {
		return errors.New("statut invalide (attendu: Validé, À vérifier, À risque)")
	}
	return nil
}
