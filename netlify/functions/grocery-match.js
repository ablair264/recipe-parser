exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { ingredients, store = 'tesco' } = JSON.parse(event.body || '{}');

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ingredients array required' }),
      };
    }

    const clean = (s) => {
      if (!s) return '';
      let x = String(s).toLowerCase();
      // remove quantity and unit prefixes (very simple heuristic)
      x = x.replace(/^(about\s+)?[0-9]+(?:[\/.,][0-9]+)?\s*(cups?|tsp|teaspoons?|tbsp|tablespoons?|g|grams?|kg|ml|millilitres?|l|litres?|oz|ounces?)\b/gi, '');
      // remove leading numbers like "1 1/2"
      x = x.replace(/^[0-9]+\s+[0-9]+\/[0-9]+\s*/, '');
      // remove parentheses notes
      x = x.replace(/\([^)]*\)/g, '');
      // keep common keywords only
      x = x.replace(/[,.;:]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      // remove words that are unlikely to help search
      x = x.replace(/\b(optional|to taste)\b/g, '').trim();
      return x || String(s);
    };

    const buildSearchUrl = (q, which) => {
      const enc = encodeURIComponent(q);
      switch (which) {
        case 'tesco':
          return `https://www.tesco.com/groceries/en-GB/search?query=${enc}`;
        case 'sainsburys':
          return `https://www.sainsburys.co.uk/gol-ui/SearchResults/${enc}`;
        case 'asda':
          return `https://groceries.asda.com/search/${enc}`;
        default:
          return `https://www.tesco.com/groceries/en-GB/search?query=${enc}`;
      }
    };

    const items = ingredients.map((ing) => {
      const query = clean(ing);
      return {
        ingredient: ing,
        query,
        searchUrl: buildSearchUrl(query, store),
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ store, items }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'failed to match groceries', details: e.message }),
    };
  }
};

