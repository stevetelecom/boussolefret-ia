from fastapi import FastAPI

app = FastAPI(title="BoussoleFret IA - AI Service")


@app.get("/health")
def health():
    return {"service": "ai-service", "status": "ok"}


# TODO endpoints a venir :
# - POST /embed          -> vectorise un lot de textes (pgvector)
# - POST /ask             -> pipeline RAG : recherche pgvector + génération de réponse sourcée
# - POST /detect-anomaly  -> score de similarité d'un document vs corpus habituel
# - (consommateur NATS)   -> écoute "docs.ingested", vectorise et indexe automatiquement
