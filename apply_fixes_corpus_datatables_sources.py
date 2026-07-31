#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Applique les 3 correctifs (indexation corpus muette, DataTables vide,
bouton "voir les sources") sur une copie locale du repo boussolefret-ia.

USAGE :
    cd /chemin/vers/boussolefret-ia   # racine du repo (contient clients/ et services/)
    python3 apply_fixes_corpus_datatables_sources.py

Le script est idempotent-safe : si un bloc a déjà été appliqué ou ne
correspond plus exactement à votre copie locale, il s'arrête avec un
message clair au lieu de corrompre le fichier.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

FILES = {
    "lang": ROOT / "clients/web-angular/src/app/core/lang.service.ts",
    "docs_page": ROOT / "clients/web-angular/src/app/pages/documents/documents-page.component.ts",
    "main_go": ROOT / "services/go-api/cmd/api/main.go",
}


def apply_replacement(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count == 0:
        print(f"[ECHEC] {label}\n  -> bloc introuvable dans {path}\n  -> le fichier a peut-être déjà été modifié, vérifiez manuellement.")
        sys.exit(1)
    if count > 1:
        print(f"[ECHEC] {label}\n  -> bloc trouvé {count} fois (attendu 1) dans {path}, remplacement ambigu.")
        sys.exit(1)
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"[OK] {label}")


def main() -> None:
    for key, path in FILES.items():
        if not path.exists():
            print(f"[ECHEC] Fichier introuvable : {path}\n"
                  f"-> lancez ce script depuis la RACINE du repo (là où se trouvent clients/ et services/).")
            sys.exit(1)

    # ------------------------------------------------------------------
    # 1) lang.service.ts — nouvelles clés de traduction (FR)
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["lang"],
        "    'toast.download_failed': 'Échec du téléchargement.',\n",
        "    'toast.download_failed': 'Échec du téléchargement.',\n"
        "    'toast.doc_saved_index_failed': \"Document enregistré, mais l'indexation corpus a échoué : {{reason}}\",\n",
        "lang.service.ts : clé toast.doc_saved_index_failed (FR)",
    )

    apply_replacement(
        FILES["lang"],
        "    'documents.empty_corpus': \"Aucun texte réglementaire indexé pour l'instant. "
        "Le corpus est vide, donc l'assistant Ask (RAG) répondra systématiquement par une abstention "
        "(garde-fou EF-RAG-03).\",\n",
        "    'documents.empty_corpus': \"Aucun texte réglementaire indexé pour l'instant. "
        "Le corpus est vide, donc l'assistant Ask (RAG) répondra systématiquement par une abstention "
        "(garde-fou EF-RAG-03).\",\n"
        "    'documents.err_sources_forbidden': \"Seul le rôle Administrateur corpus peut consulter les sources indexées.\",\n"
        "    'documents.err_sources_load': \"Impossible de charger les sources indexées.\",\n"
        "    'documents.err_sources_network': \"Erreur réseau lors du chargement des sources.\",\n",
        "lang.service.ts : clés documents.err_sources_* (FR)",
    )

    # ------------------------------------------------------------------
    # 2) lang.service.ts — nouvelles clés de traduction (EN)
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["lang"],
        "    'toast.download_failed': 'Download failed.',\n",
        "    'toast.download_failed': 'Download failed.',\n"
        "    'toast.doc_saved_index_failed': 'Document saved, but corpus indexing failed: {{reason}}',\n",
        "lang.service.ts : clé toast.doc_saved_index_failed (EN)",
    )

    apply_replacement(
        FILES["lang"],
        "    'documents.empty_corpus': 'No regulatory text indexed yet. The corpus is empty, "
        "so the Ask (RAG) assistant will always abstain (EF-RAG-03 guardrail).',\n",
        "    'documents.empty_corpus': 'No regulatory text indexed yet. The corpus is empty, "
        "so the Ask (RAG) assistant will always abstain (EF-RAG-03 guardrail).',\n"
        "    'documents.err_sources_forbidden': 'Only the Corpus Administrator role can view indexed sources.',\n"
        "    'documents.err_sources_load': 'Unable to load indexed sources.',\n"
        "    'documents.err_sources_network': 'Network error while loading sources.',\n",
        "lang.service.ts : clés documents.err_sources_* (EN)",
    )

    # ------------------------------------------------------------------
    # 3) documents-page.component.ts — modale "Voir les sources" (template)
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["docs_page"],
        '        <app-modal [title]="lang.t(\'documents.sources_title\')" [(show)]="showSourcesModal" '
        '(save)="showSourcesModal=false" (close)="showSourcesModal=false">\n'
        '          <div *ngIf="sourcesLoading">{{ lang.t(\'common.loading\') }}</div>\n'
        '          <div *ngIf="!sourcesLoading && sources.length === 0" class="empty-state">\n'
        "            {{ lang.t('documents.empty_corpus') }}\n"
        "          </div>\n",
        '        <app-modal [title]="lang.t(\'documents.sources_title\')" [(show)]="showSourcesModal" '
        '(save)="showSourcesModal=false" (close)="showSourcesModal=false">\n'
        '          <div *ngIf="sourcesLoading">{{ lang.t(\'common.loading\') }}</div>\n'
        '          <p class="form-error" *ngIf="!sourcesLoading && sourcesError">{{ sourcesError }}</p>\n'
        '          <div *ngIf="!sourcesLoading && !sourcesError && sources.length === 0" class="empty-state">\n'
        "            {{ lang.t('documents.empty_corpus') }}\n"
        "          </div>\n",
        "documents-page.component.ts : template modale sources",
    )

    # ------------------------------------------------------------------
    # 4) documents-page.component.ts — suppression de l'init prématurée DataTables
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["docs_page"],
        "  ngAfterViewInit(): void {\n"
        "    try {\n"
        "      this.dt = ($('#docs-table') as any).DataTable({\n"
        "        paging: true,\n"
        "        searching: true,\n"
        "        info: true,\n"
        "        language: this.dataTableLanguage(),\n"
        "      });\n"
        "    } catch (e) {\n"
        "      console.warn('DataTables init failed', e);\n"
        "    }\n"
        "  }\n",
        "  // Volontairement vide : DataTables ne doit être initialisé qu'une fois les\n"
        "  // documents chargés (voir rebuildTable(), appelé depuis loadDocs()). Un\n"
        "  // appel .DataTable() ici, sur le <table> encore vide au premier rendu,\n"
        "  // fait que jQuery DataTables capture un instantané \"0 ligne\" — et son\n"
        "  // destroy() ultérieur (dans rebuildTable) RESTAURE cet instantané vide,\n"
        "  // effaçant les lignes qu'Angular avait pourtant bien rendues entre-temps.\n"
        "  // C'est ce qui causait \"7 fichiers\" dans l'en-tête mais un tableau vide.\n"
        "  ngAfterViewInit(): void {}\n",
        "documents-page.component.ts : suppression init prématurée DataTables",
    )

    # ------------------------------------------------------------------
    # 5) documents-page.component.ts — toast succès/échec indexation
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["docs_page"],
        "        const chunksIndexed = typeof body.corpus_chunks_indexed === 'number' ? body.corpus_chunks_indexed : 0;\n"
        "        if (!wasEdit && chunksIndexed > 0) {\n"
        "          this.toast.success(this.lang.t('toast.doc_added_indexed', { count: chunksIndexed }));\n"
        "        } else {\n"
        "          this.toast.success(this.lang.t(wasEdit ? 'toast.doc_updated' : 'toast.doc_added'));\n"
        "        }\n",
        "        const chunksIndexed = typeof body.corpus_chunks_indexed === 'number' ? body.corpus_chunks_indexed : 0;\n"
        "        const indexError = typeof body.corpus_index_error === 'string' ? body.corpus_index_error : '';\n"
        "\n"
        "        // Le document lui-même (métadonnées + fichier) est toujours créé/mis à\n"
        "        // jour avec succès à ce stade (res.ok) — mais l'indexation RAG est une\n"
        "        // étape séparée qui peut échouer (PDF illisible, API embeddings en\n"
        "        // panne...). On distingue clairement les deux, plutôt que d'afficher\n"
        "        // un succès générique qui masquerait un corpus resté vide.\n"
        "        if (indexError) {\n"
        "          this.toast.error(this.lang.t('toast.doc_saved_index_failed', { reason: indexError }));\n"
        "        } else if (chunksIndexed > 0) {\n"
        "          this.toast.success(this.lang.t('toast.doc_added_indexed', { count: chunksIndexed }));\n"
        "        } else {\n"
        "          this.toast.success(this.lang.t(wasEdit ? 'toast.doc_updated' : 'toast.doc_added'));\n"
        "        }\n",
        "documents-page.component.ts : toast succès/échec indexation",
    )

    # ------------------------------------------------------------------
    # 6) documents-page.component.ts — openSources() avec vraies erreurs
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["docs_page"],
        "  async openSources(): Promise<void> {\n"
        "    this.showSourcesModal = true;\n"
        "    this.sourcesLoading = true;\n"
        "    try {\n"
        "      const res = await this.auth.authFetch('/corpus');\n"
        "      this.sources = res.ok ? await res.json() : [];\n"
        "    } catch (e) {\n"
        "      console.error(e);\n"
        "      this.sources = [];\n"
        "    } finally {\n"
        "      this.sourcesLoading = false;\n"
        "    }\n"
        "  }\n",
        "  sourcesError = '';\n"
        "\n"
        "  async openSources(): Promise<void> {\n"
        "    this.showSourcesModal = true;\n"
        "    this.sourcesLoading = true;\n"
        "    this.sourcesError = '';\n"
        "    this.sources = [];\n"
        "    try {\n"
        "      const res = await this.auth.authFetch('/corpus');\n"
        "      if (res.ok) {\n"
        "        this.sources = await res.json();\n"
        "      } else if (res.status === 403) {\n"
        "        // Rôle sans droit sur /corpus (réservé admin_corpus) — message\n"
        "        // explicite plutôt qu'un silencieux \"corpus vide\" trompeur.\n"
        "        this.sourcesError = this.lang.t('documents.err_sources_forbidden');\n"
        "      } else {\n"
        "        this.sourcesError = this.lang.t('documents.err_sources_load');\n"
        "        this.toast.error(this.lang.t('documents.err_sources_load'));\n"
        "      }\n"
        "    } catch (e) {\n"
        "      console.error('openSources error', e);\n"
        "      this.sourcesError = this.lang.t('documents.err_sources_network');\n"
        "      this.toast.error(this.lang.t('documents.err_sources_network'));\n"
        "    } finally {\n"
        "      this.sourcesLoading = false;\n"
        "    }\n"
        "  }\n",
        "documents-page.component.ts : openSources() avec vraies erreurs",
    )

    # ------------------------------------------------------------------
    # 7) main.go — POST /documents : capture + réponse indexation
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["main_go"],
        "\t\t// Indexation automatique dans le corpus RAG si un texte est extractible\n"
        "\t\t// (PDF pour l'instant). Ne bloque jamais la création du document : un\n"
        "\t\t// échec d'extraction ou d'indexation est loggué, pas remonté au client\n"
        "\t\t// — le document de transport reste valide même sans corpus indexé.\n"
        "\t\tif text, exErr := ingest.ExtractText(fileHeader.Filename, fileBytes); exErr != nil {\n"
        "\t\t\tlog.Printf(\"extraction de texte impossible pour %s: %v\", fileHeader.Filename, exErr)\n"
        "\t\t} else if strings.TrimSpace(text) != \"\" {\n"
        "\t\t\tinserted, ingErr := ingestTextIntoCorpus(c.Request.Context(), corpusRepo, embeddingsClient, tenantDefault, fileHeader.Filename, text)\n"
        "\t\t\tif ingErr != nil {\n"
        "\t\t\t\tlog.Printf(\"indexation corpus partielle pour %s: %v (%d fragment(s) indexé(s))\", fileHeader.Filename, ingErr, inserted)\n"
        "\t\t\t} else {\n"
        "\t\t\t\tlog.Printf(\"document %s indexé automatiquement dans le corpus: %d fragment(s)\", fileHeader.Filename, inserted)\n"
        "\t\t\t}\n"
        "\t\t}\n"
        "\n"
        "\t\tc.JSON(http.StatusCreated, created)\n"
        "\t})\n",
        "\t\t// Indexation automatique dans le corpus RAG si un texte est extractible\n"
        "\t\t// (PDF pour l'instant). Un échec d'extraction ou d'indexation ne bloque\n"
        "\t\t// JAMAIS la création du document (le document de transport reste valide\n"
        "\t\t// même sans corpus indexé) — MAIS il doit être visible côté client, pas\n"
        "\t\t// seulement loggué côté serveur : sans ça, l'utilisateur croit que tout\n"
        "\t\t// s'est bien passé alors que le corpus RAG reste vide en silence.\n"
        "\t\tchunksIndexed := 0\n"
        "\t\tindexError := \"\"\n"
        "\t\tif text, exErr := ingest.ExtractText(fileHeader.Filename, fileBytes); exErr != nil {\n"
        "\t\t\tlog.Printf(\"extraction de texte impossible pour %s: %v\", fileHeader.Filename, exErr)\n"
        "\t\t\tindexError = \"extraction du texte impossible : \" + exErr.Error()\n"
        "\t\t} else if strings.TrimSpace(text) == \"\" {\n"
        "\t\t\t// Pas une erreur en soi (ex: PDF scanné sans couche texte) mais\n"
        "\t\t\t// l'utilisateur doit savoir que ce document n'alimentera pas Ask.\n"
        "\t\t\tindexError = \"aucun texte exploitable trouvé dans ce fichier (PDF scanné sans OCR ?)\"\n"
        "\t\t} else {\n"
        "\t\t\tinserted, ingErr := ingestTextIntoCorpus(c.Request.Context(), corpusRepo, embeddingsClient, tenantDefault, fileHeader.Filename, text)\n"
        "\t\t\tchunksIndexed = inserted\n"
        "\t\t\tif ingErr != nil {\n"
        "\t\t\t\tlog.Printf(\"indexation corpus partielle pour %s: %v (%d fragment(s) indexé(s))\", fileHeader.Filename, ingErr, inserted)\n"
        "\t\t\t\tindexError = \"échec d'indexation : \" + ingErr.Error()\n"
        "\t\t\t} else {\n"
        "\t\t\t\tlog.Printf(\"document %s indexé automatiquement dans le corpus: %d fragment(s)\", fileHeader.Filename, inserted)\n"
        "\t\t\t}\n"
        "\t\t}\n"
        "\n"
        "\t\tc.JSON(http.StatusCreated, gin.H{\n"
        "\t\t\t\"id\":                    created.ID,\n"
        "\t\t\t\"name\":                  created.Name,\n"
        "\t\t\t\"status\":                created.Status,\n"
        "\t\t\t\"file_name\":             created.FileName,\n"
        "\t\t\t\"file_size\":             created.FileSize,\n"
        "\t\t\t\"content_type\":          created.ContentType,\n"
        "\t\t\t\"has_file\":              created.HasFile,\n"
        "\t\t\t\"corpus_chunks_indexed\": chunksIndexed,\n"
        "\t\t\t\"corpus_index_error\":    indexError,\n"
        "\t\t})\n"
        "\t})\n",
        "main.go : POST /documents (capture + réponse indexation)",
    )

    # ------------------------------------------------------------------
    # 8) main.go — PUT /documents/:id : capture indexation lors du remplacement de fichier
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["main_go"],
        "\t\treplacingFile := false\n"
        "\t\toldStorageKey := existing.StorageKey\n"
        "\t\tif fileHeader, ferr := c.FormFile(\"file\"); ferr == nil {\n"
        "\t\t\tobjectKey, contentType, fileBytes, err := uploadDocumentFile(c.Request.Context(), minioClient, fileHeader)\n"
        "\t\t\tif err != nil {\n"
        "\t\t\t\tc.JSON(http.StatusBadRequest, gin.H{\"error\": err.Error()})\n"
        "\t\t\t\treturn\n"
        "\t\t\t}\n"
        "\t\t\td.FileName = fileHeader.Filename\n"
        "\t\t\td.FileSize = fileHeader.Size\n"
        "\t\t\td.ContentType = contentType\n"
        "\t\t\td.StorageKey = objectKey\n"
        "\t\t\treplacingFile = true\n"
        "\n"
        "\t\t\tif text, exErr := ingest.ExtractText(fileHeader.Filename, fileBytes); exErr != nil {\n"
        "\t\t\t\tlog.Printf(\"extraction de texte impossible pour %s: %v\", fileHeader.Filename, exErr)\n"
        "\t\t\t} else if strings.TrimSpace(text) != \"\" {\n"
        "\t\t\t\tinserted, ingErr := ingestTextIntoCorpus(c.Request.Context(), corpusRepo, embeddingsClient, tenantDefault, fileHeader.Filename, text)\n"
        "\t\t\t\tif ingErr != nil {\n"
        "\t\t\t\t\tlog.Printf(\"indexation corpus partielle pour %s: %v (%d fragment(s) indexé(s))\", fileHeader.Filename, ingErr, inserted)\n"
        "\t\t\t\t} else {\n"
        "\t\t\t\t\tlog.Printf(\"document %s indexé automatiquement dans le corpus: %d fragment(s)\", fileHeader.Filename, inserted)\n"
        "\t\t\t\t}\n"
        "\t\t\t}\n"
        "\t\t}\n",
        "\t\treplacingFile := false\n"
        "\t\toldStorageKey := existing.StorageKey\n"
        "\t\tchunksIndexed := 0\n"
        "\t\tindexError := \"\"\n"
        "\t\tif fileHeader, ferr := c.FormFile(\"file\"); ferr == nil {\n"
        "\t\t\tobjectKey, contentType, fileBytes, err := uploadDocumentFile(c.Request.Context(), minioClient, fileHeader)\n"
        "\t\t\tif err != nil {\n"
        "\t\t\t\tc.JSON(http.StatusBadRequest, gin.H{\"error\": err.Error()})\n"
        "\t\t\t\treturn\n"
        "\t\t\t}\n"
        "\t\t\td.FileName = fileHeader.Filename\n"
        "\t\t\td.FileSize = fileHeader.Size\n"
        "\t\t\td.ContentType = contentType\n"
        "\t\t\td.StorageKey = objectKey\n"
        "\t\t\treplacingFile = true\n"
        "\n"
        "\t\t\tif text, exErr := ingest.ExtractText(fileHeader.Filename, fileBytes); exErr != nil {\n"
        "\t\t\t\tlog.Printf(\"extraction de texte impossible pour %s: %v\", fileHeader.Filename, exErr)\n"
        "\t\t\t\tindexError = \"extraction du texte impossible : \" + exErr.Error()\n"
        "\t\t\t} else if strings.TrimSpace(text) == \"\" {\n"
        "\t\t\t\tindexError = \"aucun texte exploitable trouvé dans ce fichier (PDF scanné sans OCR ?)\"\n"
        "\t\t\t} else {\n"
        "\t\t\t\tinserted, ingErr := ingestTextIntoCorpus(c.Request.Context(), corpusRepo, embeddingsClient, tenantDefault, fileHeader.Filename, text)\n"
        "\t\t\t\tchunksIndexed = inserted\n"
        "\t\t\t\tif ingErr != nil {\n"
        "\t\t\t\t\tlog.Printf(\"indexation corpus partielle pour %s: %v (%d fragment(s) indexé(s))\", fileHeader.Filename, ingErr, inserted)\n"
        "\t\t\t\t\tindexError = \"échec d'indexation : \" + ingErr.Error()\n"
        "\t\t\t\t} else {\n"
        "\t\t\t\t\tlog.Printf(\"document %s indexé automatiquement dans le corpus: %d fragment(s)\", fileHeader.Filename, inserted)\n"
        "\t\t\t\t}\n"
        "\t\t\t}\n"
        "\t\t}\n",
        "main.go : PUT /documents/:id (capture indexation)",
    )

    # ------------------------------------------------------------------
    # 9) main.go — PUT /documents/:id : réponse enrichie
    # ------------------------------------------------------------------
    apply_replacement(
        FILES["main_go"],
        "\t\tif replacingFile && oldStorageKey != \"\" {\n"
        "\t\t\tif err := minioClient.Delete(c.Request.Context(), oldStorageKey); err != nil {\n"
        "\t\t\t\tlog.Printf(\"erreur suppression ancien fichier MinIO (document %d): %v\", id, err)\n"
        "\t\t\t}\n"
        "\t\t}\n"
        "\t\tc.JSON(http.StatusOK, updated)\n"
        "\t})\n",
        "\t\tif replacingFile && oldStorageKey != \"\" {\n"
        "\t\t\tif err := minioClient.Delete(c.Request.Context(), oldStorageKey); err != nil {\n"
        "\t\t\t\tlog.Printf(\"erreur suppression ancien fichier MinIO (document %d): %v\", id, err)\n"
        "\t\t\t}\n"
        "\t\t}\n"
        "\t\tc.JSON(http.StatusOK, gin.H{\n"
        "\t\t\t\"id\":                    updated.ID,\n"
        "\t\t\t\"name\":                  updated.Name,\n"
        "\t\t\t\"status\":                updated.Status,\n"
        "\t\t\t\"file_name\":             updated.FileName,\n"
        "\t\t\t\"file_size\":             updated.FileSize,\n"
        "\t\t\t\"content_type\":          updated.ContentType,\n"
        "\t\t\t\"has_file\":              updated.HasFile,\n"
        "\t\t\t\"corpus_chunks_indexed\": chunksIndexed,\n"
        "\t\t\t\"corpus_index_error\":    indexError,\n"
        "\t\t})\n"
        "\t})\n",
        "main.go : PUT /documents/:id (réponse enrichie)",
    )

    print("\nTous les correctifs ont été appliqués avec succès.")
    print("Prochaine étape :")
    print("  docker compose up -d --build web api")
    print("  # puis testez, et si OK :")
    print("  git add -A")
    print('  git commit -m "fix(api,web): surface l\'échec d\'indexation corpus, corrige DataTables, différencie les erreurs sources"')
    print("  git push")


if __name__ == "__main__":
    main()
