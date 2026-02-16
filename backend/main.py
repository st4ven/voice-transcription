from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import whisper
import os

app = FastAPI()

# Load the Whisper model once at startup
model = whisper.load_model("base")

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
