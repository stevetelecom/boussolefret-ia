// Package storage encapsule tous les accès au stockage objet (MinIO,
// compatible API S3). C'est le SEUL package du backend qui parle à MinIO :
// aucun autre package ne doit importer minio-go directement, pour garder la
// dépendance de stockage isolée et remplaçable (Clean Architecture).
package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Client encapsule la connexion MinIO et le bucket cible. Le bucket est fixé
// une fois pour toutes à la construction : jamais de nom de bucket venant
// d'une requête client (ça éliminerait toute isolation multi-tenant).
type Client struct {
	mc     *minio.Client
	bucket string
}

// NewClient ouvre la connexion au serveur MinIO. N'échoue pas si le serveur
// est momentanément injoignable (le SDK minio-go se reconnecte à la demande) ;
// utiliser EnsureBucket juste après pour vérifier réellement la connectivité
// au démarrage du service.
func NewClient(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("initialisation client MinIO: %w", err)
	}
	return &Client{mc: mc, bucket: bucket}, nil
}

// EnsureBucket crée le bucket documentaire s'il n'existe pas encore.
// Idempotent : peut être appelé à chaque démarrage du service sans risque.
func (c *Client) EnsureBucket(ctx context.Context) error {
	exists, err := c.mc.BucketExists(ctx, c.bucket)
	if err != nil {
		return fmt.Errorf("vérification du bucket %q: %w", c.bucket, err)
	}
	if exists {
		return nil
	}
	if err := c.mc.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("création du bucket %q: %w", c.bucket, err)
	}
	return nil
}

// Upload envoie le contenu du reader vers MinIO sous la clé objectKey.
// La clé est générée côté serveur (jamais dérivée du nom de fichier fourni
// par le client) : ça élimine tout risque de traversée de chemin ou
// d'écrasement d'un objet existant par un nom choisi côté client.
func (c *Client) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) error {
	_, err := c.mc.PutObject(ctx, c.bucket, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("envoi de l'objet %q vers MinIO: %w", objectKey, err)
	}
	return nil
}

// Delete supprime un objet. Appel silencieux si objectKey est vide (document
// sans fichier associé), pour simplifier les call sites.
func (c *Client) Delete(ctx context.Context, objectKey string) error {
	if objectKey == "" {
		return nil
	}
	if err := c.mc.RemoveObject(ctx, c.bucket, objectKey, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("suppression de l'objet %q: %w", objectKey, err)
	}
	return nil
}

// presignedURLTTL: durée de validité du lien de téléchargement temporaire.
// Volontairement courte — le lien n'a besoin de vivre que le temps du clic
// jusqu'au téléchargement effectif par le navigateur.
const presignedURLTTL = 15 * time.Minute

// PresignedDownloadURL génère un lien de téléchargement signé et à durée de
// vie limitée. Le bucket MinIO n'est jamais exposé publiquement : c'est
// TOUJOURS cette méthode, appelée après un contrôle RBAC réussi côté API Go,
// qui produit le seul chemin d'accès légitime à un fichier.
func (c *Client) PresignedDownloadURL(ctx context.Context, objectKey, downloadName string) (string, error) {
	reqParams := make(url.Values)
	reqParams.Set("response-content-disposition", fmt.Sprintf(`attachment; filename="%s"`, sanitizeHeaderValue(downloadName)))

	u, err := c.mc.PresignedGetObject(ctx, c.bucket, objectKey, presignedURLTTL, reqParams)
	if err != nil {
		return "", fmt.Errorf("génération du lien de téléchargement pour %q: %w", objectKey, err)
	}
	return u.String(), nil
}

// sanitizeHeaderValue retire les caractères qui pourraient casser l'en-tête
// Content-Disposition (guillemets, retours à la ligne) — le nom de fichier
// vient du client et ne doit jamais être injecté tel quel dans un en-tête HTTP.
func sanitizeHeaderValue(v string) string {
	out := make([]rune, 0, len(v))
	for _, r := range v {
		if r == '"' || r == '\n' || r == '\r' {
			continue
		}
		out = append(out, r)
	}
	if len(out) == 0 {
		return "document"
	}
	return string(out)
}
