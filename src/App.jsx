import React, { useState, useEffect } from 'react';
import { ChefHat, BookOpen, Plus, Trash2, ExternalLink, Loader2, LogOut, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RecipeParser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  
  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Recipe state
  const [url, setUrl] = useState('');
  const [parsingLoading, setParsingLoading] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [activeView, setActiveView] = useState('parser');
  const [error, setError] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load recipes when user is authenticated
  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedRecipes(data || []);
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        setAuthError('This email is already registered. Please log in instead.');
      } else {
        setAuthError('Check your email for the confirmation link!');
        setAuthView('login');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSavedRecipes([]);
    setCurrentRecipe(null);
  };

  const parseRecipe = async () => {
    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    setParsingLoading(true);
    setError('');
    setCurrentRecipe(null);

    try {
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

      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const recipe = JSON.parse(responseText);
      setCurrentRecipe(recipe);
      
    } catch (err) {
      console.error('Error parsing recipe:', err);
      setError('Failed to parse recipe. Make sure the URL is valid and contains a recipe.');
    } finally {
      setParsingLoading(false);
    }
  };

  const saveRecipe = async () => {
    if (!currentRecipe || !user) return;

    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([
          {
            user_id: user.id,
            title: currentRecipe.title,
            servings: currentRecipe.servings,
            prep_time: currentRecipe.prepTime,
            cook_time: currentRecipe.cookTime,
            ingredients: currentRecipe.ingredients,
            instructions: currentRecipe.instructions,
            source_url: currentRecipe.sourceUrl,
          }
        ])
        .select();

      if (error) throw error;

      await loadRecipes();
      setActiveView('book');
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Failed to save recipe. Please try again.');
    }
  };

  const deleteRecipe = async (id) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedRecipes(savedRecipes.filter(recipe => recipe.id !== id));
    } catch (err) {
      console.error('Error deleting recipe:', err);
    }
  };

  const loadRecipe = (recipe) => {
    setCurrentRecipe({
      title: recipe.title,
      servings: recipe.servings,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      sourceUrl: recipe.source_url,
    });
    setActiveView('parser');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <ChefHat className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Recipe Parser</h1>
            <p className="text-gray-600">Save and organize your favorite recipes</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthView('login')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                authView === 'login'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthView('signup')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                authView === 'signup'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={authView === 'login' ? handleLogin : handleSignUp}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className={`p-3 rounded-lg text-sm ${
                  authError.includes('Check your email') 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {authView === 'login' ? 'Logging in...' : 'Signing up...'}
                  </>
                ) : (
                  authView === 'login' ? 'Login' : 'Sign Up'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main app (authenticated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ChefHat className="w-10 h-10 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-800">Recipe Parser</h1>
            </div>
            <p className="text-gray-600 text-sm">Extract and organize recipes from any website</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-orange-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
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
                  disabled={parsingLoading}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {parsingLoading ? (
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
                      {recipe.prep_time && <span>⏱️ {recipe.prep_time}</span>}
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
                        href={recipe.source_url}
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
