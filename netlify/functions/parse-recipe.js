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

    // Try JSON-LD (schema.org/Recipe) first – much more reliable than LLM
    const extractFromJsonLd = (html) => {
      const scripts = [];
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(html))) {
        scripts.push(m[1]);
      }

      const tryParse = (text) => {
        try {
          // Some sites include invalid trailing commas or HTML entities; be forgiving
          return JSON.parse(text);
        } catch (_) {
          return null;
        }
      };

      const flatten = (node) => {
        if (!node) return [];
        if (Array.isArray(node)) return node.flatMap(flatten);
        if (typeof node === 'object') return [node];
        return [];
      };

      const findRecipeNodes = (json) => {
        const nodes = flatten(json);
        const out = [];
        for (const n of nodes) {
          if (!n) continue;
          const type = n['@type'];
          if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
            out.push(n);
          }
          // Search in @graph
          if (n['@graph']) {
            out.push(...findRecipeNodes(n['@graph']));
          }
        }
        return out;
      };

      for (const raw of scripts) {
        const json = tryParse(raw);
        if (!json) continue;
        const recipes = findRecipeNodes(json);
        if (recipes.length) {
          // Take the most detailed recipe
          const r = recipes[0];

          const getName = () => r.name || r.headline || '';
          const getServings = () => (r.recipeYield && (Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield)) || '';
          const getPrepTime = () => r.prepTime || '';
          const getCookTime = () => r.cookTime || r.totalTime || '';
          const getIngredients = () => {
            if (Array.isArray(r.recipeIngredient)) return r.recipeIngredient;
            return [];
          };
          const getInstructions = () => {
            const instr = r.recipeInstructions;
            if (!instr) return [];
            if (Array.isArray(instr)) {
              const items = [];
              for (const step of instr) {
                if (typeof step === 'string') items.push(step);
                else if (step && typeof step === 'object') {
                  if (Array.isArray(step.itemListElement)) {
                    for (const el of step.itemListElement) {
                      if (typeof el === 'string') items.push(el);
                      else if (el && typeof el === 'object' && (el.text || el.name)) {
                        items.push(el.text || el.name);
                      }
                    }
                  } else if (step.text || step.name) {
                    items.push(step.text || step.name);
                  }
                }
              }
              return items.filter(Boolean);
            }
            if (typeof instr === 'string') return instr.split(/\n+/).map(s => s.trim()).filter(Boolean);
            return [];
          };

          const ingredients = getIngredients();
          const instructions = getInstructions();

          if (ingredients.length && instructions.length) {
            return {
              title: getName(),
              servings: getServings(),
              prepTime: getPrepTime(),
              cookTime: getCookTime(),
              ingredients,
              instructions,
              sourceUrl: url,
              commentsSummary: ''
            };
          }
        }
      }
      return null;
    };

    const jsonLdRecipe = extractFromJsonLd(htmlContent);
    if (jsonLdRecipe) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(jsonLdRecipe)
      };
    }

    // Fallback to LLM extraction when JSON-LD is missing
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
            content: `Extract recipe information AND analyze comments from this HTML content for the URL: ${url}

IMPORTANT: Make sure you extract the recipe from this specific URL, not any cached or previous content.

${htmlContent.substring(0, 40000)}

Extract and return ONLY a JSON object with this exact structure:
{
  "title": "Recipe title",
  "servings": "Number of servings (e.g., '16 brownies', '4 servings')",
  "prepTime": "Prep time (e.g., '5 minutes', '15 mins')",
  "cookTime": "Cook time (e.g., '45 minutes', '1 hour')",
  "ingredients": ["1 1/2 cups granulated sugar", "3/4 cup all-purpose flour", "2/3 cup cocoa powder, sifted if lumpy", "1/2 cup powdered sugar, sifted if lumpy", "1/2 cup dark chocolate chips", "3/4 teaspoons sea salt", "2 large eggs", "1/2 cup canola oil or extra-virgin olive oil", "2 tablespoons water", "1/2 teaspoon vanilla"],
  "instructions": ["Preheat the oven to 325°F. Lightly spray an 8x8 baking dish with cooking spray and line it with parchment paper.", "In a medium bowl, combine the sugar, flour, cocoa powder, powdered sugar, chocolate chips, and salt.", "In a large bowl, whisk together the eggs, olive oil, water, and vanilla.", "Sprinkle the dry mix over the wet mix and stir until just combined.", "Pour the batter into the prepared pan and use a spatula to smooth the top. Bake for 40 to 48 minutes, or until a toothpick comes out with only a few crumbs attached.", "Cool completely before slicing."],
  "sourceUrl": "${url}",
  "commentsSummary": "Summary of useful cooking tips and modifications found in user comments (empty string if no useful comments found)"
}

CRITICAL REQUIREMENTS:
- Extract ALL ingredients from the complete ingredients list – do not omit any.
- Include ALL cooking steps as separate array items.
- Preserve exact measurements/notes; do not invent ingredients.
- Focus on the recipe card or structured data; ignore ads and tips.
- ANALYZE USER COMMENTS THOROUGHLY: Look for comment sections, reviews, or user feedback. Summarize useful cooking tips, substitutions, modifications, or helpful insights from real users. Include specific tips like "Users recommend chilling dough for 2 hours for best results" or "Many suggest using parchment paper to prevent sticking". If there are no meaningful comments, use empty string.
- Return ONLY valid JSON. No other text.`
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
      sourceUrl: recipe.sourceUrl || url,
      commentsSummary: recipe.commentsSummary || ''
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
