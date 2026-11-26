
from pathlib import Path

import chromadb
import fitz
from sentence_transformers import SentenceTransformer


# Project paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = BACKEND_DIR / "documents" / "job_portal_guide.pdf"
DB_PATH = Path(__file__).resolve().parent / "chroma_db"

# Embedding model: lightweight and suitable for English documentation
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def split_text(text: str) -> list[str]:
    """Split extracted text into overlapping character chunks."""
    text = " ".join(text.split())

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end == len(text):
            break

        start = end - CHUNK_OVERLAP

    return chunks


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print("Extracting text from PDF...")
    document = fitz.open(PDF_PATH)

    all_chunks = []
    all_ids = []
    all_metadata = []

    for page_number, page in enumerate(document, start=1):
        page_text = page.get_text("text")
        page_chunks = split_text(page_text)

        for chunk_number, chunk in enumerate(page_chunks, start=1):
            all_chunks.append(chunk)
            all_ids.append(f"page_{page_number}_chunk_{chunk_number}")
            all_metadata.append({
                "page": page_number,
                "source": PDF_PATH.name,
            })

    document.close()

    if not all_chunks:
        raise ValueError(
            "No text extracted. Check whether the PDF contains selectable text."
        )

    print(f"Extracted {len(all_chunks)} chunks.")
    print("Creating embeddings...")

    embeddings = model.encode(
        all_chunks,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()

    client = chromadb.PersistentClient(path=str(DB_PATH))

    # Rebuild this collection whenever the PDF is re-indexed.
    try:
        client.delete_collection("job_portal_guide")
    except Exception:
        pass

    collection = client.create_collection(
        name="job_portal_guide",
        metadata={"hnsw:space": "cosine"},
    )

    batch_size = 100

    for start in range(0, len(all_chunks), batch_size):
        end = start + batch_size

        collection.add(
            ids=all_ids[start:end],
            documents=all_chunks[start:end],
            embeddings=embeddings[start:end],
            metadatas=all_metadata[start:end],
        )

    print("\nPDF indexing completed successfully!")
    print(f"Total chunks indexed: {len(all_chunks)}")
    print(f"Database location: {DB_PATH}")


if __name__ == "__main__":
    main()
