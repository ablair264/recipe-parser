import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const handler = async (event, context) => {
  // Handle CORS
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { ingredient } = JSON.parse(event.body);

    if (!ingredient) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ingredient is required' })
      };
    }

    const prompt = `Suggest a good substitution for this cooking ingredient: "${ingredient}"

Please provide:
1. A direct substitute that would work in most recipes
2. The ratio/amount to use (e.g., "use same amount" or "use half the amount")
3. Any important notes about taste or texture differences

Keep the response concise and practical for home cooking.

Format: "[substitute ingredient] - [ratio] - [brief note if needed]"
Example: "Greek yogurt - use same amount - will add slight tanginess"`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const substitution = message.content[0].text.trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ substitution })
    };

  } catch (error) {
    console.error('Substitution error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate substitution' })
    };
  }
};