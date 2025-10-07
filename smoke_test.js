const axios = require('axios');

async function test() {
  try {
    const base = 'http://localhost:4010';
    console.log('Testing /generate-quiz');
    const q = await axios.post(base + '/generate-quiz', { topic: 'Tech Trends' }, { timeout: 10000 });
    console.log('Quiz response:', q.data.questions ? 'OK' : 'INVALID', JSON.stringify(q.data));

    console.log('Testing /generate-feedback');
    const f = await axios.post(base + '/generate-feedback', { topic: 'Tech Trends', score: 3, total: 5 }, { timeout: 10000 });
    console.log('Feedback response:', f.data.feedback ? 'OK' : 'INVALID', JSON.stringify(f.data));
  } catch (err) {
    if (err.response) {
      console.error('Smoke test failed: status', err.response.status, 'data', JSON.stringify(err.response.data));
    } else {
      console.error('Smoke test failed:', err.stack || err.message);
    }
    process.exit(2);
  }
}

test();
