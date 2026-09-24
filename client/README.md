# AI Study Application

A full-stack study assistant built with React, Express, TypeScript, and the Google Gemini API. The application transforms raw lecture notes and study text into structured flashcards and interactive multiple-choice quizzes.

---

## Technical Overview

The application utilizes a modular backend architecture to communicate with the Gemini API. By leveraging structured JSON response schemas, the backend ensures deterministic, structured data formats for frontend consumption without relying on fragile text parsing.

---

## Features

- **Flashcard Generation:** Converts lecture notes into structured study cards containing terms, definitions, and core concepts.
- **Quiz Generation:** Creates multiple-choice quizzes with randomized option arrays, correct answer indices, and explanatory feedback.
- **Type-Safe API:** Written end-to-end in TypeScript using structured schemas for AI output validation.

---

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **AI Integration:** `@google/genai` SDK (`gemini-2.5-flash`)
- **Development Tooling:** `tsx` (TypeScript execution and hot-reloading)

### Frontend
- **Framework:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Language:** TypeScript

---

## System Architecture

```text
ai-study-app/
├── client/                     # React + Vite frontend application
└── server/                     # Express + TypeScript API server
    ├── src/
    │   ├── schemas.ts          # Structured response blueprints for Gemini API
    │   ├── geminiService.ts    # AI service layer handling prompt execution
    │   ├── routes.ts           # REST API endpoints (/api/generate/*)
    │   └── index.ts            # Application entry point and server startup
    ├── .env                    # Environment configuration (ignored by Git)
    └── package.json
    
---

## REST API Reference

### Generate Flashcards
- **Endpoint:** `POST /api/generate/flashcards`
- **Headers:** `Content-Type: application/json`
- **Request Body:** `{"studyNotes": "Your study notes text here..."}`
- **Response:** `{"title": "Topic Overview", "cards": [{"front": "Term / Question", "back": "Definition / Answer"}]}`

### Generate Quiz
- **Endpoint:** `POST /api/generate/quiz`
- **Headers:** `Content-Type: application/json`
- **Request Body:** `{"studyNotes": "Your study notes text here..."}`
- **Response:** `{"quizTitle": "Topic Assessment", "questions": [{"question": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0, "explanation": "Detailed explanation."}]}`

---

## Local Development Setup

### Prerequisites
- **Node.js:** v18 or higher
- **Package Manager:** npm or yarn
- **API Key:** Gemini API Key

### Server Setup
1. **Navigate to directory:** `cd server`
2. **Install dependencies:** `npm install`
3. **Environment setup:** Create `.env` in `server` directory with `PORT=5000` and `GEMINI_API_KEY=your_key_here`
4. **Start server:** `npm run dev` (Runs at `http://localhost:5000`)