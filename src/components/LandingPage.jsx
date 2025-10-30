import React, { useState } from 'react';
import { ChefHat, Smartphone, Globe, Star, Clock, Download, ExternalLink, ArrowRight, Check, Folder as FolderIcon, FileText, Sparkles } from 'lucide-react';

// Lightweight, Tailwind-only versions of Reactbits "CardSwap" and "Folder"
function CardSwap() {
  const [swapped, setSwapped] = useState(false);
  return (
    <div className="relative group max-w-xl mx-auto h-80 select-none">
      {/* Front: Blog backstory */}
      <div
        className={`absolute inset-0 bg-white rounded-xl shadow-2xl border border-carolina-800 p-6 transition-all duration-300 ease-out ${
          swapped ? '-translate-y-4 -rotate-2 scale-95 opacity-0' : 'translate-y-0 rotate-0 opacity-100'
        } group-hover:-translate-y-4 group-hover:-rotate-2 group-hover:scale-95`}
        aria-hidden={swapped}
      >
        <div className="flex items-center gap-2 text-orange-600 mb-3">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-semibold">2,000 words later…</span>
        </div>
        <p className="text-gray-700 mb-2">
          My grandmother grew up on a small farm where every Sunday the whole
          town would gather to hear the rooster sing. Anyway, here’s a photo of
          my cat in a tiny apron…
        </p>
        <p className="text-gray-500 text-sm">
          Scroll, scroll, scroll. Ads. Popups. Ten more paragraphs before the first
          ingredient appears.
        </p>
      </div>

      {/* Back: Clean recipe */}
      <div
        className={`absolute inset-0 bg-white rounded-xl shadow-2xl border border-hunyadi-700 p-6 transition-all duration-300 ease-out ${
          swapped ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-6 rotate-1 opacity-0'
        } group-hover:translate-y-0 group-hover:rotate-0 group-hover:opacity-100`}
        aria-hidden={!swapped}
      >
        <div className="flex items-center gap-2 text-hunyadi-600 mb-3">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Just the recipe</span>
        </div>
        <h4 className="font-bold text-gray-800 mb-2">Weeknight Lasagna</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Ingredients</div>
            <ul className="list-disc ml-4 text-gray-600 space-y-1">
              <li>Pasta sheets</li>
              <li>Tomato sauce</li>
              <li>Mozzarella</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-1">Steps</div>
            <ol className="list-decimal ml-4 text-gray-600 space-y-1">
              <li>Layer</li>
              <li>Bake 35 min</li>
              <li>Serve</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <button
          onClick={() => setSwapped(!swapped)}
          className="px-3 py-1.5 bg-hunyadi-500 text-white text-xs rounded-full shadow hover:bg-hunyadi-600"
          aria-pressed={swapped}
        >
          {swapped ? 'Show Blog Version' : 'Show Recipe Version'}
        </button>
        <span className="text-[11px] text-gray-500">or hover to preview</span>
      </div>
    </div>
  );
}

function FolderPreview() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-lapis-800">
        <div className="h-10 bg-gradient-to-r from-lapis-500 to-carolina-400 flex items-center px-4 text-white">
          <FolderIcon className="w-4 h-4 mr-2" /> Saved Recipes
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {[ 'Smash Burgers', 'Lemon Drizzle Cake', 'Crispy Tofu', 'One-Pot Pasta' ].map((title, i) => (
              <div key={i} className="border border-carolina-800 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="h-1 bg-hunyadi-500 rounded mb-2" />
                <div className="text-sm font-semibold text-gray-800 line-clamp-1">{title}</div>
                <div className="text-xs text-gray-500">{i % 2 ? 'from AllRecipes' : 'from Food Network'}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-hunyadi-500 text-white rounded-lg text-sm hover:bg-hunyadi-600">
              <Globe className="w-4 h-4" /> Launch Web App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-carolina-900 to-lapis-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/logo.png" alt="Get The Recipe!" className="w-16 h-16 object-contain" />
              <h1 className="text-5xl font-bold text-charcoal-500">
                Get The Recipe!
              </h1>
            </div>
            <p className="text-xl text-charcoal-400 mb-8 max-w-2xl mx-auto">
              Transform any recipe URL into a clean, organized format. Save time cooking with our smart recipe parser that extracts ingredients and instructions from any website.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-hunyadi-500 text-white rounded-lg font-semibold hover:bg-hunyadi-600 transition-colors flex items-center gap-2 justify-center"
              >
                <Globe className="w-5 h-5" />
                Try Web App Now
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#download"
                className="px-8 py-4 border-2 border-lapis-500 text-lapis-700 rounded-lg font-semibold hover:bg-lapis-500 hover:text-white transition-colors flex items-center gap-2 justify-center"
              >
                <Smartphone className="w-5 h-5" />
                Get Mobile App
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* No-life-story Section with CardSwap + Folder */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              I came for lasagna, not your life story
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Paste a link. We skip the novel and deliver clean ingredients and steps — fast.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <CardSwap />
            </div>
            <div>
              <FolderPreview />
            </div>
          </div>
        </div>
      </div>

      {/* App Showcase Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                Available Everywhere You Cook
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Access your recipes on any device. Start on your phone, continue on your tablet, finish on your laptop.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Instant recipe parsing from any website</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Save and organize your favorite recipes</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Offline access to saved recipes</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Automatic measurement conversion</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onGetStarted}
                  className="px-6 py-3 bg-hunyadi-500 text-white rounded-lg font-semibold hover:bg-hunyadi-600 transition-colors flex items-center gap-2 justify-center"
                >
                  <Globe className="w-5 h-5" />
                  Launch Web App
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="bg-gradient-to-r from-hunyadi-500 to-hunyadi-600 h-2 rounded-t-lg mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Classic Chocolate Brownies
                </h3>
                <p className="text-sm text-gray-500 italic mb-4">from AllRecipes</p>
                <div className="flex gap-2 mb-4">
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-800">16</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span className="text-xs font-medium text-green-800">15 mins</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-full">
                    <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                    <span className="text-xs font-medium text-orange-800">45 mins</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>10</strong> ingredients • <strong>6</strong> steps
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div id="download" className="bg-gradient-to-r from-hunyadi-500 to-hunyadi-600 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Get The Mobile App
          </h2>
          <p className="text-xl text-hunyadi-100 mb-12 max-w-3xl mx-auto">
            Take your recipes with you anywhere. Download the mobile app for iOS and Android to cook offline and sync across all your devices.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="https://apps.apple.com/app/get-the-recipe"
              className="bg-black text-white px-8 py-4 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors"
            >
              <Download className="w-6 h-6" />
              <div className="text-left">
                <div className="text-xs">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.gettherecipe"
              className="bg-black text-white px-8 py-4 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors"
            >
              <Download className="w-6 h-6" />
              <div className="text-left">
                <div className="text-xs">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-hunyadi-100 mt-8 text-sm">
            Coming soon to App Store and Google Play
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="Get The Recipe!" className="w-8 h-8 object-contain" />
            <h3 className="text-xl font-bold text-white">Get The Recipe!</h3>
          </div>
          <p className="text-gray-400 mb-6">
            Making cooking easier, one recipe at a time.
          </p>
          <button
            onClick={onGetStarted}
            className="px-6 py-3 bg-hunyadi-500 text-white rounded-lg font-semibold hover:bg-hunyadi-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <Globe className="w-5 h-5" />
            Start Cooking Better
          </button>
        </div>
      </div>
    </div>
  );
}
