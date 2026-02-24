const fetch = require('node-fetch');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://chriselj.github.io',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async function (event) {
  console.log('HTTP Method:', event.httpMethod);
  console.log('Event body:', event.body);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key loaded:', apiKey ? 'Yes' : 'No');
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Server misconfigured: missing OPENAI_API_KEY.' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing request body.' }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON format.' }),
    };
  }

  const prompt = requestBody?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing prompt in request body.' }),
    };
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI naturalist. Your goal is to provide friendly, educational feedback on species identification. Please follow these guidelines:

1. Encourage the user.
2. If guess is close, highlight differences; if too general, explain how to narrow.
3. Describe correct species with key ID features.
4. Compare to user's guess.
5. Conclude with a positive next-step tip.
6. Decline inappropriate content.
7. Keep the total response under 150 words. Be concise and focus only on key field identification features.

Use HTML: <p>, <ul>/<li>, <strong>.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

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

      return {
        statusCode: openaiRes.status, // <-- important: return the real status
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'OpenAI API error',
          status: openaiRes.status,
          message,
        }),
      };
    }

    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      console.error('Unexpected OpenAI response shape:', data);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Unexpected OpenAI response shape',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: content }),
    };
  } catch (error) {
    console.error('Function exception:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Server error calling OpenAI',
        details: error.message,
      }),
    };
  }
};