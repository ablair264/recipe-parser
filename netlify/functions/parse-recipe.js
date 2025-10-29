exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Anthropic API key not configured' })
      };
    }

    // First, fetch the recipe page content
    const pageResponse = await fetch(url);
    if (!pageResponse.ok) {
      throw new Error('Failed to fetch recipe page');
    }
    
    const htmlContent = await pageResponse.text();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Please extract recipe information from this HTML content:

${htmlContent.substring(0, 15000)}

Extract and return ONLY a JSON object with this exact structure:
{
  "title": "Recipe title",
  "servings": "Number of servings (if available)",
  "prepTime": "Prep time (if available)",
  "cookTime": "Cook time (if available)",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "sourceUrl": "${url}"
}

DO NOT include any text outside the JSON object. Your entire response must be valid JSON only.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to parse recipe');
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    // Clean up the response text
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON response
    const recipe = JSON.parse(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(recipe)
    };

  } catch (error) {
    console.error('Error parsing recipe:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to parse recipe. Make sure the URL is valid and contains a recipe.',
        details: error.message 
      })
    };
  }
};