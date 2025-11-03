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

    // Helper: basic HTML entity decode and tag stripping
    const decodeEntities = (str = '') => str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
    const stripTags = (html = '') => decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s{2,}/g, ' ').trim();

    // Extract text list items after a heading like "Ingredients" / "Instructions"
    const extractListAfterHeading = (html, headingWord) => {
      const headingRe = new RegExp(`<h[1-6][^>]*>\\s*${headingWord}\\s*<\\/h[1-6]>`, 'i');
      const m = html.match(headingRe);
      let listHtml = '';
      if (m && m.index != null) {
        const start = m.index + m[0].length;
        const tail = html.slice(start);
        const listMatch = tail.match(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i);
        if (listMatch) listHtml = listMatch[2];
      }
      if (!listHtml) {
        // Try classes like ingredient-list / instructions
        const listClassMatch = html.match(/<(ul|ol)[^>]*(class|id)=["'][^"']*(ingredient|ingredient-list|ingredients|instruction|instructions)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i);
        if (listClassMatch) listHtml = listClassMatch[4];
      }
      if (!listHtml) return [];
      const items = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let lm;
      while ((lm = liRe.exec(listHtml))) {
        const t = stripTags(lm[1]);
        if (t) items.push(t);
      }
      return items;
    };

    // Microdata (itemprop) extractors
    const extractByItemprop = (html, prop) => {
      const out = [];
      // content="..."
      const contentRe = new RegExp(`itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'gi');
      let m1;
      while ((m1 = contentRe.exec(html))) {
        const t = stripTags(m1[1]);
        if (t) out.push(t);
      }
      // <tag itemprop>inner text</tag>
      const innerRe = new RegExp(`<[^>]*itemprop=["']${prop}["'][^>]*>([\s\S]*?)<\/[^>]+>`, 'gi');
      let m2;
      while ((m2 = innerRe.exec(html))) {
        const t = stripTags(m2[1]);
        if (t) out.push(t);
      }
      return out;
    };

    const extractIngredientsSections = (html) => {
      // Extract region between Ingredients and Instructions headings
      const sectionMatch = (() => {
        const startRe = /<h[1-6][^>]*>\s*ingredients\s*<\/h[1-6]>/i;
        const endRe = /<h[1-6][^>]*>\s*(instructions|method|directions)\s*<\/h[1-6]>/i;
        const start = html.search(startRe);
        if (start === -1) return null;
        const tail = html.slice(start);
        const endIdxLocal = tail.search(endRe);
        const end = endIdxLocal === -1 ? html.length : start + endIdxLocal;
        return html.slice(start, end);
      })();
      if (!sectionMatch) return null;

      const region = sectionMatch;

      // If checkbox bullets exist, split on that first to preserve author formatting
      if (region.includes('▢')) {
        // Split on checkbox bullets and capture any header immediately before each bullet
        const tokens = region.split('▢');
        const out = [];
        const pushHeaderIfAny = (pre) => {
          const txt = stripTags(pre || '').trim();
          // pick last header-like phrase ending with ':' and not too long
          const m = txt.match(/([A-Za-z][A-Za-z\s()'’\-]{2,80}):\s*$/m);
          if (m) {
            const header = m[1].trim() + ':';
            if (!out.length || out[out.length - 1] !== header) out.push(header);
          }
        };
        const looksIngredient = (t) => {
          if (!t) return false;
          const isLong = t.length > 180;
          const endsSentence = /\.[\s\)]*$/.test(t);
          const hasVerb = /(add|place|roast|sa(u|)t[eé]|simmer|bring|blitz|serve|preheat|squeeze|pour|bake|cook|arrange)/i.test(t);
          const hasMeasure = /(\d|¼|½|¾|\b(cup|cups|tsp|tbsp|g|kg|mg|ml|l|oz|lb|cloves?|leaves?|sheets?|bunch|stick|pinch|litre|liter|grams?)\b)/i.test(t);
          const shortFreeform = t.length <= 40 && /(salt|pepper|cheese|basil|cream|tomato|onion|garlic)/i.test(t);
          return !isLong && !hasVerb && (!endsSentence || hasMeasure) && (hasMeasure || shortFreeform);
        };
        for (let i = 1; i < tokens.length; i++) {
          // preface before this bullet (may contain a section header)
          pushHeaderIfAny(tokens[i - 1]);
          const bulletText = stripTags(tokens[i]).trim();
          if (looksIngredient(bulletText)) out.push(bulletText);
        }
        return out;
      }

      // Otherwise, walk headings and lists in order and pair heading -> following list
      const items = [];
      let lastHeader = null;
      const re = /(<h[2-5][^>]*>[\s\S]*?<\/h[2-5]>)|(<(ul|ol)[^>]*>[\s\S]*?<\/\3>)/gi;
      let m;
      while ((m = re.exec(region))) {
        const block = m[0];
        if (/^<h/i.test(block)) {
          const label = stripTags(block);
          if (/:\s*$/.test(label)) {
            lastHeader = label.trim();
          } else {
            // If it looks like a section but no colon, append one to help grouping
            if (/sauce|ragu|bolognese|lasagn/i.test(label)) {
              lastHeader = (label.trim() + ':');
            } else {
              lastHeader = null;
            }
          }
        } else {
          // list
          const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
          let lm;
          const listItems = [];
          while ((lm = liRe.exec(block))) {
            const t = stripTags(lm[1]);
            if (t) listItems.push(t);
          }
          if (listItems.length) {
            if (lastHeader) {
              items.push(lastHeader);
              lastHeader = null;
            }
            items.push(...listItems);
          }
        }
      }
      return items.length ? items : null;
    };

    const extractFromHtmlStructure = (html, urlForContext) => {
      // Try microdata first
      let ingredients = extractByItemprop(html, 'recipeIngredient');
      let instructions = extractByItemprop(html, 'recipeInstructions');

      // Sometimes instructions are steps nested as <li itemprop> or HowToStep
      if (instructions.length === 0) {
        const howToStepRe = /<[^>]*itemprop=["'](recipeInstructions|step|howtostep)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
        let ms;
        while ((ms = howToStepRe.exec(html))) {
          const t = stripTags(ms[2]);
          if (t) instructions.push(t);
        }
      }

      // If still empty, use heading-based lists
      if (ingredients.length === 0) ingredients = extractListAfterHeading(html, 'ingredients');
      if (instructions.length === 0) instructions = extractListAfterHeading(html, 'instructions');

      // Try to enhance ingredients with author-provided sections if present
      const sectioned = extractIngredientsSections(html);
      if (sectioned && sectioned.length >= Math.max(ingredients.length, 3)) {
        ingredients = sectioned;
      }

      // Heuristic: a minimal valid parse requires at least 3 ingredients and 2 steps
      if (ingredients.length >= 3 && instructions.length >= 2) {
        return {
          title: (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim(),
          servings: (html.match(/itemprop=["']recipeYield["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''),
          prepTime: (html.match(/itemprop=["']prepTime["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''),
          cookTime: (html.match(/itemprop=["']cookTime["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''),
          ingredients,
          instructions,
          sourceUrl: urlForContext,
          commentsSummary: ''
        };
      }
      return null;
    };

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
      // Try to enhance JSON-LD ingredients with author-provided sections
      const sectioned = extractIngredientsSections(htmlContent);
      // Only override JSON-LD if it is empty/poor; otherwise, trust JSON-LD
      if ((!jsonLdRecipe.ingredients || jsonLdRecipe.ingredients.length === 0) && sectioned && sectioned.length >= 3) {
        jsonLdRecipe.ingredients = sectioned;
      }
      // JSON-LD found, but still analyze comments with LLM
      console.log('Analyzing comments for recipe:', jsonLdRecipe.title);
      try {
        const commentResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: `Analyze the comments section of this recipe page and summarize useful cooking tips and modifications from users:

${htmlContent.substring(0, 30000)}

Look for comment sections, reviews, or user feedback. Summarize useful cooking tips, substitutions, modifications, or helpful insights from real users. Include specific tips like "Users recommend chilling dough for 2 hours for best results" or "Many suggest using parchment paper to prevent sticking".

Return ONLY a concise summary text (no JSON, no quotes). If there are no meaningful comments, return "No helpful comments found".`
              }
            ]
          })
        });

        if (commentResponse.ok) {
          const commentData = await commentResponse.json();
          const commentsSummary = commentData.content[0].text.trim();
          jsonLdRecipe.commentsSummary = commentsSummary === "No helpful comments found" ? '' : commentsSummary;
        }
      } catch (error) {
        console.warn('Comment analysis failed:', error);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(jsonLdRecipe)
      };
    }

    // Fallback 1: Structured HTML (microdata/headings) without LLM
    const structured = extractFromHtmlStructure(htmlContent, url);
    if (structured) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(structured)
      };
    }

    // Fallback 2: LLM extraction when both JSON-LD and structured HTML are missing/insufficient
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
