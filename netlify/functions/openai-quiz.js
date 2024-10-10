const fetch = require('node-fetch');

exports.handler = async function (event) {
  // This will read the OpenAI API key from the environment variable set in Netlify
  const apiKey = process.env.OPENAI_API_KEY; 

  // Parse the prompt from the request body (sent from the frontend)
  const { prompt } = JSON.parse(event.body);

  try {
    // Make a request to the OpenAI API
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        prompt: prompt,
        max_tokens: 150
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: data.choices[0].text })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch response from OpenAI API.' })
    };
  }
};
