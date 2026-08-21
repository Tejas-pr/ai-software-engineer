# apps/api/app/rag/embeddings.py
"""
Embedding model adapter — same idea as `app/agents/llm.py`'s
`get_chat_model`, one level down: turns text into a vector instead of text
into text. Gemini's `gemini-embedding-001` natively outputs 3072
dimensions but supports Matryoshka truncation down to 768 via
`output_dimensionality`; Ollama's `nomic-embed-text` outputs 768 natively.
Both pinned to 768 here to match `DocumentChunk.embedding` (`Vector(768)`)
— no schema juggling to swap providers.

We use LangChain's `Embeddings` classes here (not raw httpx) because this is
exactly the boring, well-defined "text in, vector out" call where an
abstraction earns its keep — there's no provider-specific behavior worth
seeing raw, unlike the tool-calling loop in `services/llm.py`.
"""

from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings

from app.config import settings

EMBEDDING_DIM = 768


@lru_cache(maxsize=1)
def get_embeddings_model() -> Embeddings:
    """Gemini if a key is configured (better quality), else local Ollama."""
    if settings.GEMINI_API_KEY:
        return GoogleGenerativeAIEmbeddings(  # type: ignore[call-arg]
            model="models/gemini-embedding-001",
            google_api_key=settings.GEMINI_API_KEY,
            output_dimensionality=EMBEDDING_DIM,
        )
    return OllamaEmbeddings(model="nomic-embed-text", base_url=settings.OLLAMA_BASE_URL)
