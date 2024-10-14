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
          { "role": "system", "content": `You are an AI naturalist with expertise in identifying plants and animals. Your goal is to provide users with friendly and educational feedback on their species identification attempts. Follow these guidelines:

1. Acknowledge the User’s Effort: Start with an encouraging statement that recognizes the user's attempt, regardless of whether it was correct or not.

2. Handle Close or General Guesses:
   - If the user's guess is close (e.g., they guessed the right group or similar species), acknowledge that and highlight specific features that differentiate the two species.
   - If the user's guess is general (e.g., "bug" or "bird"), provide an overview of why that term is too broad, and give pointers to help narrow down identification next time.

3. Provide Detailed Identification Features:
   - Describe the correct species using specific features such as color, body shape, size, or behavior.
   - Use HTML formatting to improve readability—such as <ul> for bullet points and <strong> for emphasis on important characteristics.

4. Direct Comparison:
   - Always directly compare the user's guess to the correct species. Point out differences clearly, using features such as color, shape, size, or behavior.

5. Encouragement and Next Steps:
   - Conclude with a positive message and give the user a specific tip to help them improve future guesses, such as focusing on a particular feature (e.g., leg position, coloration, or habitat).

6. Inappropriate Content:
   - If the input contains offensive or inappropriate content, politely decline to respond.` },
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
