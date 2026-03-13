const fetch = require('node-fetch');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://chriselj.github.io',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
const MAX_PROMPT_LENGTH = 2000;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  console.log('HTTP Method:', event.httpMethod);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, { error: 'Server misconfigured: missing OPENAI_API_KEY.' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'Missing request body.' });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid JSON format.' });
  }

  if (typeof requestBody?.prompt !== 'string') {
    return jsonResponse(400, { error: 'Missing prompt in request body.' });
  }

  const prompt = requestBody.prompt.trim();
  if (!prompt) {
    return jsonResponse(400, { error: 'Missing prompt in request body.' });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonResponse(413, {
      error: `Prompt too long. Maximum length is ${MAX_PROMPT_LENGTH} characters.`,
    });
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId;

  try {
    const openaiRes = await Promise.race([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        ...(controller ? { signal: controller.signal } : {}),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an AI naturalist. Give friendly, educational species-ID feedback while minimizing hallucinations.

Rules:
1. Treat the species names supplied by the user prompt as authoritative ground truth.
2. Do not reinterpret names, invent alternate taxa, or infer hidden meanings from uncommon names.
3. If uncertain about a specific comparison detail, state uncertainty briefly instead of guessing.
4. Encourage the user.
5. If guess is close, highlight differences; if too general, explain how to narrow.
6. Describe the correct species with key ID features and compare to the user's guess.
7. Conclude with a positive next-step tip.
8. Decline inappropriate content.
9. Keep total response under 150 words, concise and focused on field ID features.

Output HTML only using: <p>, <ul>/<li>, <strong>.`,
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 350,
          temperature: 0.7,
        }),
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (controller) controller.abort();
          const timeoutError = new Error(`Request to OpenAI timed out after ${REQUEST_TIMEOUT_MS}ms.`);
          timeoutError.name = 'AbortError';
          reject(timeoutError);
        }, REQUEST_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timeoutId);

    const raw = await openaiRes.text(); // read as text first
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    // If OpenAI returned an error, bubble it up clearly (don’t call it a 500)
    if (!openaiRes.ok) {
      const message =
        data?.error?.message ||
        raw?.slice(0, 500) ||
        `OpenAI request failed (${openaiRes.status})`;

      console.error('OpenAI error:', openaiRes.status, message);

      return jsonResponse(openaiRes.status, {
        error: 'OpenAI API error',
        status: openaiRes.status,
        message,
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      console.error('Unexpected OpenAI response shape:', data);
      return jsonResponse(502, {
        error: 'Unexpected OpenAI response shape',
      });
    }

    return jsonResponse(200, { message: content });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return jsonResponse(504, {
        error: `Request to OpenAI timed out after ${REQUEST_TIMEOUT_MS}ms.`,
      });
    }

    console.error('Function exception:', error);
    return jsonResponse(500, {
      error: 'Server error calling OpenAI',
      details: error.message,
    });
  }
};
