const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

const PY_WORKER = path.join(__dirname, 'ai_worker.py');

function runPythonWorker(action, payload) {
  return new Promise((resolve, reject) => {
    // On Windows, python executable may be 'py' or 'python'
    const candidates = ['python', 'py'];
    let tried = 0;
    const trySpawn = () => {
      if (tried >= candidates.length) {
        return reject(new Error('No python executable found (tried python, py)'));
      }
      const exe = candidates[tried++];
      const proc = spawn(exe, [PY_WORKER, action]);
      let stdout = '';
      let stderr = '';

      proc.stdin.setEncoding('utf-8');
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('error', (err) => {
        console.warn(`Spawn ${exe} failed:`, err.message);
        // try next candidate
        trySpawn();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Python worker (${exe}) exited with code ${code}: ${stderr}`));
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Invalid JSON from worker: ${err.message}\nSTDOUT:${stdout}\nSTDERR:${stderr}`));
        }
      });

      // send payload
      try {
        proc.stdin.write(JSON.stringify(payload || {}));
        proc.stdin.end();
      } catch (err) {
        // if writing fails, kill the process and try next candidate
        try { proc.kill(); } catch (e) {}
        trySpawn();
      }
    };

    trySpawn();
  });
}

// Validate quiz schema roughly
function validateQuiz(obj) {
  if (!obj || !Array.isArray(obj.questions) || obj.questions.length === 0) return false;
  for (const q of obj.questions) {
    if (typeof q.prompt !== 'string') return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (typeof q.answer_index !== 'number') return false;
  }
  return true;
}

app.post('/generate-quiz', async (req, res) => {
  const topic = req.body.topic || 'General Knowledge';
  try {
    const payload = { topic, count: 5 };
    const maxRetries = 2;
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await runPythonWorker('generate_quiz', payload);
        if (!validateQuiz(result)) throw new Error('Validation failed');
        return res.json(result);
      } catch (err) {
        lastErr = err;
        console.warn('Attempt', attempt, 'failed:', err && err.stack ? err.stack : err.message);
      }
    }
    res.status(500).json({ error: 'Failed to generate quiz', details: lastErr.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/generate-feedback', async (req, res) => {
  const { topic, score, total } = req.body;
  try {
    const payload = { topic, score, total };
    const result = await runPythonWorker('generate_feedback', payload);
    if (!result || typeof result.feedback !== 'string') {
      return res.status(500).json({ error: 'Invalid feedback from AI' });
    }
    res.json(result);
  } catch (err) {
    console.error('generate-feedback error:', err && err.stack ? err.stack : err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4010;
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`AI Quiz backend listening on http://${HOST}:${PORT}`));
