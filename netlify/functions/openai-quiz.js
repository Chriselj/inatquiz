const fetch = require('node-fetch');

exports.handler = async function (event) {
  console.log('HTTP Method:', event.httpMethod);
  console.log('Event body:', event.body);

  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key loaded:', apiKey ? 'Yes' : 'No');

  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ message: 'CORS preflight response' })
    };
  }

  if (!event.body) {
    console.error('Missing request body.');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Missing request body.' })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
    console.log('Parsed request body:', requestBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Invalid JSON format.' })
    };
  }

  const { prompt } = requestBody;

  if (!prompt) {
    console.error('Missing prompt in request body.');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Missing prompt in request body.' })
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { "role": "system", "content": `You are an AI naturalist. Your goal is to provide friendly, educational feedback on species identification. Please follow these guidelines:

1. **Encourage the User**: Acknowledge their effort with a positive statement.

2. **Handle Guesses**:
   - If the guess is close, highlight subtle differences.
   - If the guess is too general, explain why and provide tips to narrow down future guesses.

3. **Identify the Correct Species**:
   - Describe key features (e.g., color, body shape, behavior).
   - Use HTML to format clearly: wrap paragraphs in <p>, use <ul>/<li> for lists, and <strong> for emphasis.

4. **Compare to User's Guess**:
   - Compare the guess to the correct species, noting key differences.

5. **Encourage Next Steps**: Conclude with a positive tip for improving future guesses.

6. **Decline Inappropriate Content**: Politely decline if input is offensive.

Make sure your response is clear and easy to read by using proper HTML tags.` },
          { "role": "user", "content": prompt }
        ],
        max_tokens: 1000
      })
    });

    console.log('OpenAI API request sent.');

    const data = await response.json();
    console.log('OpenAI API Response:', data);

    if (response.ok) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ message: data.choices[0].message.content })
      };
    } else {
      console.error('Error from OpenAI API:', data);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ error: 'OpenAI API error.', details: data })
      };
    }

  } catch (error) {
    console.error('Error during fetch or response processing:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://chriselj.github.io', // Replace with your frontend URL
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Failed to fetch or parse response from OpenAI API.', details: error.message })
    };
  }
};
