const fetch = require('node-fetch');

exports.handler = async function (event) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body.' })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON format.' })
    };
  }

  const { prompt } = requestBody;

  if (!prompt) {
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
        model: 'gpt-4o-mini', // Updated model name
        messages: [
          { "role": "system", "content": "You are a helpful assistant." },
          { "role": "user", "content": prompt }
        ],
        max_tokens: 150
      })
    });

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
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch response from OpenAI API.' })
    };
  }
};
