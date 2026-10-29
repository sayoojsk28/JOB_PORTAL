
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

DB_PATH = Path(__file__).resolve().parent / "chroma_db"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)
client = chromadb.PersistentClient(path=str(DB_PATH))
collection = client.get_collection("job_portal_guide")

question = input("Ask a question about the Job Portal: ")

question_embedding = model.encode(
    [question],
    normalize_embeddings=True,
).tolist()

results = collection.query(
    query_embeddings=question_embedding,
    n_results=3,
)

print("\n--- Retrieved documentation ---")

for i, document in enumerate(results["documents"][0], start=1):
    metadata = results["metadatas"][0][i - 1]
    print(f"\nResult {i} | PDF page {metadata['page']}")
    print(document)
