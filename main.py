from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import hashlib
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

CACHE_FILE = "cache.json"
API_KEY = os.getenv("GOOGLE_API_KEY")

# İstek modeli
class TranslateRequest(BaseModel):
    text: str
    target: str

# Hash üret
def generate_hash(text: str, lang: str) -> str:
    combined = f"{text}::{lang}"
    return hashlib.sha256(combined.encode()).hexdigest()

# Cache oku
def load_cache():
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Cache yaz
def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

# Çeviri endpoint
@app.post("/translate")
async def translate_text(req: TranslateRequest):
    cache = load_cache()
    key = generate_hash(req.text, req.target)

    if key in cache:
        return {"translated_text": cache[key]}

    # Google Translate API’ye httpx ile async istek
    url = "https://translation.googleapis.com/language/translate/v2"
    params = { "key": API_KEY }
    payload = {
        "q": req.text,
        "target": req.target,
        "format": "text"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, params=params, json=payload)
        result = response.json()

    translated = result["data"]["translations"][0]["translatedText"]

    cache[key] = translated
    save_cache(cache)

    return {"translated_text": translated}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)