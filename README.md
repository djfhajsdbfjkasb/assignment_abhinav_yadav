# AI-Assisted Knowledge Quiz — Backend

This backend provides two endpoints to support an interactive AI-driven quiz experience:

- POST /generate-quiz — generate 5 MCQs for a topic (JSON output)
- POST /generate-feedback — generate a custom feedback message given score/total

It uses a Python worker (`ai_worker.py`) to call OpenAI if `OPENAI_API_KEY` is set, otherwise a deterministic fallback response is used.

Setup (Windows PowerShell):

```powershell
cd c:\Users\ajays\Desktop\Assn_Abhinav\backend
npm install
# Optional: set OPENAI_API_KEY
$env:OPENAI_API_KEY = "sk-..."
npm start
```

API examples:

Generate quiz:

POST http://localhost:4010/generate-quiz
Body: { "topic": "Wellness" }

Generate feedback:

POST http://localhost:4010/generate-feedback
Body: { "topic": "Wellness", "score": 4, "total": 5 }

Problem understanding & assumptions

- The backend is responsible for AI orchestration. The frontend will call endpoints to get quizzes and feedback.
- Prompts must return JSON. We parse and validate; if malformed, we retry before falling back.
- Python is used for AI calls (easier to use openai-python) and Node/Express for HTTP server.

AI prompt iterations and notes

- Initial simple prompt produced inconsistent outputs; to fix we force the model to ONLY output JSON and provide a clear schema.
- Implemented parsing and retries in both Node and Python layers.

Architecture

- `server.js` — Express HTTP server, spawns Python worker to generate quizzes and feedback.
- `ai_worker.py` — Python script that calls OpenAI ChatCompletion, enforces JSON output, and has a deterministic fallback.

Known improvements

- Add unit tests for schema validation and worker calls.
- Use a message queue (e.g., Redis) for scaling long-running AI calls.
- Add rate-limiting and API keys for frontend clients.

