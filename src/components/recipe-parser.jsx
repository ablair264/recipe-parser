import React, { useState } from 'react';
import { ChefHat, BookOpen, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';

export default function RecipeParser() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [activeView, setActiveView] = useState('parser'); // 'parser' or 'book'
  const [error, setError] = useState('');

  const parseRecipe = async () => {
    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentRecipe(null);

    try {
      // Fetch the webpage content
      const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `Please fetch this recipe URL and extract the recipe information: ${url}

IMPORTANT: You have access to a web_fetch tool. Use it to fetch the content of the URL I provided.

After fetching, extract and return ONLY a JSON object with this exact structure:
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

      const data = await fetchResponse.json();
      
      if (!fetchResponse.ok) {
        throw new Error(data.error?.message || 'Failed to parse recipe');
      }

      // Extract and parse the JSON response
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const recipe = JSON.parse(responseText);
      setCurrentRecipe(recipe);
      
    } catch (err) {
      console.error('Error parsing recipe:', err);
      setError('Failed to parse recipe. Make sure the URL is valid and contains a recipe.');
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = () => {
    if (currentRecipe) {
      const recipeWithId = { ...currentRecipe, id: Date.now() };
      setSavedRecipes([recipeWithId, ...savedRecipes]);
      setActiveView('book');
    }
  };

  const deleteRecipe = (id) => {
    setSavedRecipes(savedRecipes.filter(recipe => recipe.id !== id));
  };

  const loadRecipe = (recipe) => {
    setCurrentRecipe(recipe);
    setActiveView('parser');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <ChefHat className="w-12 h-12 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-800">Recipe Parser</h1>
          </div>
          <p className="text-gray-600">Extract and organise recipes from any website</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setActiveView('parser')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeView === 'parser'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-orange-50'
            }`}
          >
            <Plus className="w-5 h-5" />
            Parse Recipe
          </button>
          <button
            onClick={() => setActiveView('book')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeView === 'book'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-orange-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Recipe Book ({savedRecipes.length})
          </button>
        </div>

        {/* Parser View */}
        {activeView === 'parser' && (
          <div className="space-y-6">
            {/* URL Input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipe URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/recipe"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && parseRecipe()}
                />
                <button
                  onClick={parseRecipe}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    'Parse Recipe'
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-red-600 text-sm">{error}</p>
              )}
            </div>

            {/* Current Recipe Display */}
            {currentRecipe && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      {currentRecipe.title}
                    </h2>
                    <a
                      href={currentRecipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 text-sm flex items-center gap-1"
                    >
                      View original <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <button
                    onClick={saveRecipe}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Save to Book
                  </button>
                </div>

                {/* Recipe Meta Info */}
                <div className="flex gap-6 mb-6 text-sm text-gray-600">
                  {currentRecipe.servings && (
                    <div>
                      <span className="font-medium">Servings:</span> {currentRecipe.servings}
                    </div>
                  )}
                  {currentRecipe.prepTime && (
                    <div>
                      <span className="font-medium">Prep:</span> {currentRecipe.prepTime}
                    </div>
                  )}
                  {currentRecipe.cookTime && (
                    <div>
                      <span className="font-medium">Cook:</span> {currentRecipe.cookTime}
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-orange-200">
                    Ingredients
                  </h3>
                  <ul className="space-y-2">
                    {currentRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-orange-600 font-bold mt-1">•</span>
                        <span className="text-gray-700">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-orange-200">
                    Instructions
                  </h3>
                  <ol className="space-y-4">
                    {currentRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 pt-1">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recipe Book View */}
        {activeView === 'book' && (
          <div className="space-y-4">
            {savedRecipes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  Your recipe book is empty
                </h3>
                <p className="text-gray-500">
                  Parse and save recipes to build your collection
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {savedRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-800 flex-1">
                        {recipe.title}
                      </h3>
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-600 mb-4">
                      {recipe.servings && <span>🍽️ {recipe.servings}</span>}
                      {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">{recipe.ingredients.length}</span> ingredients • 
                      <span className="font-medium"> {recipe.instructions.length}</span> steps
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => loadRecipe(recipe)}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                      >
                        View Recipe
                      </button>
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
