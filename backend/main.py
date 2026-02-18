from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

import whisper
import os
import requests

load_dotenv()  # Load environment variables from .env file

app = FastAPI()

# Load the Whisper model once at startup
model = whisper.load_model("base")

# Get OpenRouter API key from environment variables
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Ensure the API key is set
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY is not set in the environment variables")

# CORS for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # React development server
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint to handle file uploads and transcribe audio
@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    
    if file.size > 10_000_000:  # Limit file size to 10MB
        return {"error": "File size exceeds 10MB limit"}
    
    # Save the uploaded file to a temporary location
    temp_path = f"/tmp/{file.filename}"
    
    # Write the uploaded file to disk
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())
    
    try:
        # Transcribe the audio file using Whisper
        result = model.transcribe(temp_path)
    except Exception as e:
        # Clean up the temporary file even if transcription fails
        os.remove(temp_path)
        return {"error": "Transcription failed"}
    
    # Clean up the temporary file
    os.remove(temp_path)
    
    # Return the transcribed text as a JSON response
    return {"text": result["text"]}

def clean_transcript(text: str) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}"
    }
    
    payload = {
        "model": "openrouter/free",
        "messages": [
            {"role": "system", "content": "You are a transcript cleaner. Return ONLY the cleaned transcript text. Do NOT add explanations, bullet points, labels, or quotes. Do NOT say 'Cleaned Transcript'. Output plain text only."},
            {"role": "user", "content": f"Clean up the following transcript:\n\n{text}"}
        ]}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()  # Raise an error for bad status codes
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error calling OpenRouter API: {e}")
        return text  # Return original text if cleaning fails
    
class CleanRequest(BaseModel):
    text: str

@app.post("/api/clean")
async def clean(request: CleanRequest):
    cleaned_text = clean_transcript(request.text)
    return {"cleaned_text": cleaned_text}