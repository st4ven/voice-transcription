# AI Voice Transcription App

## Description

A full-stack web application that allows users to record or upload audio files and receive real-time AI-generated speech-to-text transcripts.  
The app also includes an AI-powered transcript cleaning feature that removes filler words and improves readability.

This project demonstrates end-to-end product development, from browser audio capture to backend AI processing and polished UI delivery.

---

## Tech Stack
* **Frontend:** React, TypeScript, TailwindCSS, Browser MediaRecorder API, Fetch API
* **Backend:** Python, FastAPI, Uvicorn
* **AI/Processing:** Whisper, OpenRouter API 

---

## Features
* In-browser audio recording: pause/resume audio controls, visual recording status indicator
* File upload support: drag-and-drop or click-to upload audio files, audio preview and download
* AI speech to text: converts spoken audio into readable transcripts
* Transcript cleaning: Removes filler words, improves grammar and readability using LLM post-processing
* Copy to clipboard: quickly copy transcripts
* Loading & status feedback: clear UI indicators while processing
* Responsive UI: Clean and intuitive design using Tailwind CSS