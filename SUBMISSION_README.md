AI-Assisted Knowledge Quiz — Submission

What's included
- server.js — Express backend that delegates AI calls to ai_worker.py
- ai_worker.py — Python worker that calls OpenAI (if configured) or returns deterministic fallback
- package.json, smoke_test.js, README.md
- .env.example, .gitignore, .gitattributes

How to run (Windows PowerShell)
1. Install deps:
   cd backend
   npm install

2. (Optional) Configure OpenAI key in same PowerShell session:
   $env:OPENAI_API_KEY = "sk-..."

3. Start server:
   npm start

4. Verify health and endpoints:
   Invoke-RestMethod -Uri 'http://127.0.0.1:4010/health' -Method Get -UseBasicParsing
   Invoke-RestMethod -Uri 'http://127.0.0.1:4010/generate-quiz' -Method Post -Body (ConvertTo-Json @{topic='Wellness'}) -ContentType 'application/json' -UseBasicParsing

Notes
- Do NOT commit or upload node_modules; use the provided .gitignore.
- If OpenAI key is not provided, the worker returns deterministic placeholder questions.

Contact
- If anything fails, run `node smoke_test.js` and attach `server_out.log` and `server_err.log` when asking for help.
