#!/usr/bin/env python
import sys
import json
import os
import time

# Minimal AI worker that calls OpenAI if API key present, otherwise returns deterministic fallback.
try:
    import openai
except Exception:
    openai = None

PROMPT_TEMPLATE = '''
Generate {count} multiple-choice questions about the topic: "{topic}".
Return output as JSON with the following structure:
{{
    "questions": [
        {{
            "prompt": string,
            "options": [string, ...],
            "answer_index": integer  // index into options array for correct answer
        }}
    ]
}}
Only output valid JSON. No extra commentary.
'''


FEEDBACK_PROMPT = '''
Given topic: "{topic}", score: {score}, total: {total}, produce JSON:
{{"feedback": string}}
Only output valid JSON.
'''


def read_stdin_json():
    raw = sys.stdin.read()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


def call_openai(prompt, max_attempts=2):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key or not openai:
        return None
    openai.api_key = api_key
    for attempt in range(max_attempts):
        try:
            resp = openai.ChatCompletion.create(
                model='gpt-4o-mini',
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800
            )
            return resp['choices'][0]['message']['content']
        except Exception as e:
            last = e
            time.sleep(0.8 * (attempt + 1))
    return None


def generate_quiz(topic='General Knowledge', count=5):
    prompt = PROMPT_TEMPLATE.format(topic=topic, count=count)
    text = call_openai(prompt)
    if text:
        # try parse as JSON
        try:
            return json.loads(text)
        except Exception:
            pass
    # fallback deterministic generator
    qs = []
    for i in range(count):
        prompt_text = f"What is example {i+1} about {topic}?"
        options = [f"Option A for {i+1}", f"Option B for {i+1}", f"Option C for {i+1}", f"Option D for {i+1}"]
        answer_index = i % len(options)
        qs.append({
            'prompt': prompt_text,
            'options': options,
            'answer_index': answer_index
        })
    return {'questions': qs}


def generate_feedback(topic, score, total):
    prompt = FEEDBACK_PROMPT.format(topic=topic, score=score, total=total)
    text = call_openai(prompt)
    if text:
        try:
            return json.loads(text)
        except Exception:
            pass
    # fallback simple feedback
    pct = (score / total) * 100 if total else 0
    if pct >= 80:
        msg = f"Great job! You scored {score}/{total} on {topic}. You're well above average. Keep it up!"
    elif pct >= 50:
        msg = f"Not bad — you scored {score}/{total} on {topic}. A little more review and you'll be solid."
    else:
        msg = f"You scored {score}/{total} on {topic}. Don't worry — focus on key concepts and try again."
    return {'feedback': msg}


def main():
    args = sys.argv[1:]
    action = args[0] if args else 'generate_quiz'
    payload = read_stdin_json()
    if action == 'generate_quiz':
        topic = payload.get('topic', 'General Knowledge')
        count = payload.get('count', 5)
        out = generate_quiz(topic, count)
        sys.stdout.write(json.dumps(out, ensure_ascii=False))
    elif action == 'generate_feedback':
        topic = payload.get('topic', 'General Knowledge')
        score = payload.get('score', 0)
        total = payload.get('total', 5)
        out = generate_feedback(topic, score, total)
        sys.stdout.write(json.dumps(out, ensure_ascii=False))
    else:
        sys.stderr.write('Unknown action')
        sys.exit(2)

if __name__ == '__main__':
    main()
