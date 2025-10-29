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

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
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
      const fetchResponse = await fetch('/.netlify/functions/parse-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await fetchResponse.json();
      
      if (!fetchResponse.ok) {
        throw new Error(data.error || 'Failed to parse recipe');
      }

      // Validate and sanitize the recipe data
      const validatedRecipe = {
        title: data.title || 'Untitled Recipe',
        servings: data.servings || '',
        prepTime: data.prepTime || '',
        cookTime: data.cookTime || '',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
        sourceUrl: data.sourceUrl || url
      };

      setCurrentRecipe(validatedRecipe);
      
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Defaff Recipes</h1>
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

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {authLoading ? 'Signing in...' : 'Continue with Google'}
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
              <h1 className="text-3xl font-bold text-gray-800">Defaff Recipes</h1>
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
