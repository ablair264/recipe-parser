import React from 'react';
import { ChefHat, Smartphone, Globe, Star, Clock, Download, ExternalLink, ArrowRight, Check } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-carolina-900 to-lapis-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/logo.png" alt="Get The Recipe!" className="w-16 h-16 object-contain" />
              <h1 className="text-5xl font-bold text-white">
                Get The Recipe!
              </h1>
            </div>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
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
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors flex items-center gap-2 justify-center"
              >
                <Smartphone className="w-5 h-5" />
                Get Mobile App
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Why Choose Get The Recipe?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop scrolling through endless blog posts to find the actual recipe. Our smart parser cuts through the noise.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-hunyadi-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-hunyadi-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Save Time
              </h3>
              <p className="text-gray-600">
                Skip the life stories and ads. Get straight to the ingredients and instructions in seconds.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Clean Format
              </h3>
              <p className="text-gray-600">
                Beautifully formatted recipes with clear ingredient lists and step-by-step instructions.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Smart Features
              </h3>
              <p className="text-gray-600">
                UK/US measurement conversion, ingredient substitutions, and community cooking tips.
              </p>
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