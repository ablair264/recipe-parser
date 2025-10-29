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
            content: `Extract recipe information from this HTML content. Look for recipe cards, structured data, or recipe sections.

${htmlContent.substring(0, 15000)}

Extract and return ONLY a JSON object with this exact structure:
{
  "title": "Recipe title",
  "servings": "Number of servings (e.g., '16 brownies', '4 servings')",
  "prepTime": "Prep time (e.g., '5 minutes', '15 mins')",
  "cookTime": "Cook time (e.g., '45 minutes', '1 hour')",
  "ingredients": ["1 1/2 cups granulated sugar", "3/4 cup all-purpose flour", "2/3 cup cocoa powder"],
  "instructions": ["Preheat the oven to 325°F", "In a medium bowl, combine the sugar, flour, cocoa powder", "Bake for 40 to 48 minutes"],
  "sourceUrl": "${url}"
}

Instructions for extraction:
- Look for ingredients lists (often marked with "Ingredients" heading)
- Look for numbered or bulleted instruction steps
- Extract prep/cook times from recipe metadata or headings
- Include exact measurements and quantities
- Keep instructions as separate steps
- Ignore ads, equipment lists, and notes unless they're critical instructions

Return ONLY valid JSON. No other text.`
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
    let recipe;
    try {
      recipe = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and ensure required fields exist
    const validatedRecipe = {
      title: recipe.title || 'Untitled Recipe',
      servings: recipe.servings || '',
      prepTime: recipe.prepTime || '',
      cookTime: recipe.cookTime || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      sourceUrl: recipe.sourceUrl || url
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validatedRecipe)
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