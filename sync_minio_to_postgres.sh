#!/bin/bash
set -e

echo "🔄 Synchronisation MinIO → PostgreSQL"
echo "======================================"

PGUSER="boussolefret"
PGDB="boussolefret"

echo "📊 État actuel :"
NB_DOCS_AVANT=$(docker exec -i bf_postgres psql -U "$PGUSER" -d "$PGDB" -t -c "SELECT COUNT(*) FROM documents;" | xargs)
echo "   Documents en PostgreSQL : $NB_DOCS_AVANT"

NB_FILES=$(docker exec bf_minio sh -c "find /data/boussolefret-documents/BGFT -type f 2>/dev/null | wc -l" || echo "0")
echo "   Fichiers dans MinIO : $NB_FILES"
echo ""

if [ "$NB_FILES" -eq "0" ]; then
    echo "❌ Aucun fichier dans MinIO"
    exit 0
fi

echo "💾 Synchronisation en cours..."

docker exec bf_minio sh -c "find /data/boussolefret-documents/BGFT -type f" | while IFS= read -r filepath; do
    filename=$(basename "$filepath")
    storage_key=$(echo "$filepath" | sed 's|/data/boussolefret-documents/||')
    filesize=$(docker exec bf_minio stat -c%s "$filepath" 2>/dev/null || echo "0")

    if [[ "$filename" == *.pdf ]]; then
        content_type="application/pdf"
    else
        content_type="application/octet-stream"
    fi

    echo "  → $filename (${filesize} octets)"

    docker exec -i bf_postgres psql -U "$PGUSER" -d "$PGDB" > /dev/null 2>&1 << EOFSQL
INSERT INTO documents (name, status, file_name, file_size, content_type, storage_key, uploaded_by)
VALUES ('$filename', 'À vérifier', '$filename', $filesize, '$content_type', '$storage_key', 'admin@bgft.cm')
ON CONFLICT DO NOTHING;
EOFSQL
done

echo ""
echo "✅ Synchronisation terminée !"
NB_DOCS_APRES=$(docker exec -i bf_postgres psql -U "$PGUSER" -d "$PGDB" -t -c "SELECT COUNT(*) FROM documents;" | xargs)
echo "   Documents en PostgreSQL : $NB_DOCS_APRES"
echo ""
echo "🎯 Rechargez http://localhost:3000"
