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

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[str] = []


@app.post('/ask', response_model=AskResponse)
def ask(req: AskRequest):
    # Phase 1: mock response; replace with real RAG pipeline calling embeddings/pgvector
    return AskResponse(answer=f"Réponse simulée pour : {req.question}", sources=["LVO_2026.pdf"])
