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

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL' })
      };
    }

    console.log('Fetching preview for URL:', url);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Recipe-Parser/1.0; +https://recipe-parser.netlify.app)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract meta tags using regex (simple approach)
    const getMetaContent = (property, content = html) => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*?)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*?)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*name=["']${property}["']`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitle = getMetaContent('og:title');
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : '') || 'Recipe Page';

    // Extract description
    const ogDescription = getMetaContent('og:description');
    const metaDescription = getMetaContent('description');
    const description = ogDescription || metaDescription || '';

    // Extract image
    const ogImage = getMetaContent('og:image');
    const twitterImage = getMetaContent('twitter:image');
    let image = ogImage || twitterImage || null;

    // Make relative URLs absolute
    if (image && !image.startsWith('http')) {
      const baseUrl = new URL(url);
      if (image.startsWith('//')) {
        image = baseUrl.protocol + image;
      } else if (image.startsWith('/')) {
        image = baseUrl.origin + image;
      } else {
        image = new URL(image, url).href;
      }
    }

    // Extract site name
    const ogSiteName = getMetaContent('og:site_name');
    const siteName = ogSiteName || new URL(url).hostname.replace('www.', '') || '';

    const preview = {
      title: title.substring(0, 200), // Limit length
      description: description.substring(0, 300), // Limit length
      image,
      siteName,
      url
    };

    console.log('Preview extracted:', {
      title: preview.title,
      siteName: preview.siteName,
      hasImage: !!preview.image,
      hasDescription: !!preview.description
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preview)
    };

  } catch (error) {
    console.error('Error fetching URL preview:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch URL preview',
        details: error.message 
      })
    };
  }
};