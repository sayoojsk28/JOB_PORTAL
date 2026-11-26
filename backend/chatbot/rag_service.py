import time
from pathlib import Path

import chromadb
from gemini_service import generate_gemini_text
from sentence_transformers import SentenceTransformer


# Paths and model configuration
CHATBOT_DIR = Path(__file__).resolve().parent
DB_PATH = CHATBOT_DIR / "chroma_db"

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL_NAME = "llama3.2:latest"

# Load the embedding model once
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# Connect to the existing ChromaDB collection
chroma_client = chromadb.PersistentClient(path=str(DB_PATH))
collection = chroma_client.get_collection("job_portal_guide")


def answer_question(question: str) -> dict:
    question = question.strip()
    start_time = time.perf_counter()

    if not question:
        return {
            "answer": "Please enter a question.",
            "source_pages": [],
        }
    t0 = time.perf_counter()
    # 1. Convert the question into an embedding
    question_embedding = embedding_model.encode(
        [question],
        normalize_embeddings=True,
    ).tolist()
    print(f"Embedding time: {time.perf_counter() - t0:.2f}s")
    t0 = time.perf_counter()

    # 2. Retrieve the three most relevant PDF chunks
    results = collection.query(
        query_embeddings=question_embedding,
        n_results=3,
        include=["documents", "metadatas", "distances"],
    )

    documents = results["documents"][0]
    metadata = results["metadatas"][0]
    distances = results["distances"][0]

    print(f"Retrieval time: {time.perf_counter() - t0:.2f}s")
    t0 = time.perf_counter()

    # 3. Avoid answering when the retrieved information is too unrelated
    if not documents or min(distances) > 0.65:
        return {
            "answer": (
                "I couldn't find enough relevant information "
                "about this in the Job Portal guide."
            ),
            "source_pages": [],
        }

    context_parts = []

    for document, details in zip(documents, metadata):
        page_number = details["page"]
        context_parts.append(
            f"[PDF page {page_number}]\n{document}"
        )

    context = "\n\n".join(context_parts)

    # 4. Ask the local LLM to answer using only the retrieved context
    answer = generate_gemini_text(
        prompt=(
            f"Job Portal guide context:\n{context}\n\n"
            f"Student's question:\n{question}"
        ),
        system_prompt=(
            "You are the Job Portal AI Assistant for students. "
            "Answer questions using only the supplied Job Portal "
            "guide context. Do not invent features, rules, or "
            "policies. If the context does not contain the answer, "
            "clearly say that the guide does not provide enough "
            "information."
        ),
        temperature=0,
        max_output_tokens=150,
    )
    print(f"LLM generation time: {time.perf_counter() - t0:.2f}s")
    print(f"Total processing time: {time.perf_counter() - start_time:.2f}s")

    # 5. Return the answer and its PDF page references
    source_pages = sorted({
        details["page"]
        for details in metadata
    })

    return {
        "answer": answer.strip(),
        "source_pages": source_pages,
    }
