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

    // First, fetch the recipe page content with no-cache headers
    console.log('Fetching URL:', url);
    const pageResponse = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch recipe page: ${pageResponse.status}`);
    }
    
    const htmlContent = await pageResponse.text();
    console.log('HTML content length:', htmlContent.length);
    console.log('HTML preview:', htmlContent.substring(0, 500));

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
            content: `Extract ALL recipe information from this HTML content for the URL: ${url}

IMPORTANT: Make sure you extract the recipe from this specific URL, not any cached or previous content.

${htmlContent.substring(0, 20000)}

Extract and return ONLY a JSON object with this exact structure:
{
  "title": "Recipe title",
  "servings": "Number of servings (e.g., '16 brownies', '4 servings')",
  "prepTime": "Prep time (e.g., '5 minutes', '15 mins')",
  "cookTime": "Cook time (e.g., '45 minutes', '1 hour')",
  "ingredients": ["1 1/2 cups granulated sugar", "3/4 cup all-purpose flour", "2/3 cup cocoa powder, sifted if lumpy", "1/2 cup powdered sugar, sifted if lumpy", "1/2 cup dark chocolate chips", "3/4 teaspoons sea salt", "2 large eggs", "1/2 cup canola oil or extra-virgin olive oil", "2 tablespoons water", "1/2 teaspoon vanilla"],
  "instructions": ["Preheat the oven to 325°F. Lightly spray an 8x8 baking dish with cooking spray and line it with parchment paper.", "In a medium bowl, combine the sugar, flour, cocoa powder, powdered sugar, chocolate chips, and salt.", "In a large bowl, whisk together the eggs, olive oil, water, and vanilla.", "Sprinkle the dry mix over the wet mix and stir until just combined.", "Pour the batter into the prepared pan and use a spatula to smooth the top. Bake for 40 to 48 minutes, or until a toothpick comes out with only a few crumbs attached.", "Cool completely before slicing."],
  "sourceUrl": "${url}"
}

CRITICAL REQUIREMENTS:
- Extract ALL ingredients from the complete ingredients list, not just the first few
- Include ALL cooking steps as separate array items
- Include full instructions with details (like "spray an 8x8 baking dish" not just "preheat oven")
- Preserve exact measurements and cooking notes
- Look for the complete recipe section, not just the beginning
- Ignore ads, sponsored content, equipment lists, and recipe notes/tips

The ingredients list should have 10 items and instructions should have 5-6 detailed steps minimum.

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