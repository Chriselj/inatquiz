const fetch = require('node-fetch');

exports.handler = async function (event) {
  // Log the event body to check if it's received correctly
  console.log('Event body:', event.body);

  const apiKey = process.env.OPENAI_API_KEY;
  // Log if the API key is present
  console.log('API Key loaded:', apiKey ? 'Yes' : 'No');

  if (!event.body) {
    console.error('Missing request body.');
    return {
      statusCode: 400,
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
      body: JSON.stringify({ error: 'Invalid JSON format.' })
    };
  }

  const { prompt } = requestBody;

  if (!prompt) {
    console.error('Missing prompt in request body.');
    return {
      statusCode: 400,
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
        model: 'gpt-4o-mini', // Use GPT-4o Mini model
        messages: [
          { "role": "system", "content": "You are a helpful assistant." },
          { "role": "user", "content": prompt }
        ],
        max_tokens: 150
      })
    });

    console.log('OpenAI API request sent.');

    // Log the status code and headers of the response
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const data = await response.json();
    console.log('OpenAI API Response:', data);

    if (response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: data.choices[0].message.content })
      };
    } else {
      console.error('Error from OpenAI API:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI API error.', details: data })
      };
    }

  } catch (error) {
    console.error('Error during fetch or response processing:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch or parse response from OpenAI API.', details: error.message })
    };
  }
};
