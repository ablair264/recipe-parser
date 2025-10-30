import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Smartphone, Globe, Star, Clock, Download, ExternalLink, ArrowRight, Check, Folder as FolderIcon, FileText, Sparkles, Zap, Shield, Users, TrendingUp, Search, BookMarked } from 'lucide-react';

// Animated text reveal component
function SplitText({ text, className = '' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <span aria-label={text} className={`inline-block ${className}`}>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-block transform transition-all duration-700 ease-out ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

// Enhanced card swap with smoother animations
function CardSwap() {
  const [swapped, setSwapped] = useState(false);
  
  return (
    <div className="relative group max-w-xl mx-auto h-96 select-none perspective-1000">
      {/* Front: Blog backstory */}
      <div
        className={`absolute inset-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 transition-all duration-500 ease-out cursor-pointer ${
          swapped 
            ? '-translate-y-6 -rotate-3 scale-90 opacity-0 pointer-events-none' 
            : 'translate-y-0 rotate-0 opacity-100 hover:-translate-y-2 hover:shadow-3xl'
        }`}
        onClick={() => setSwapped(true)}
        aria-hidden={swapped}
      >
        <div className="flex items-center gap-2 text-red-500 mb-4">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wide">2,000 words later...</span>
        </div>
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            My grandmother grew up on a small farm where every Sunday the whole
            town would gather to hear the rooster sing. Anyway, here's a photo of
            my cat in a tiny apron...
          </p>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
          <p className="text-gray-400 text-sm italic border-l-4 border-gray-300 pl-4">
            Scroll, scroll, scroll. Ads. Popups. Ten more paragraphs before the first
            ingredient appears.
          </p>
          <div className="text-center pt-4">
            <span className="text-xs text-gray-400">Click to see the better way →</span>
          </div>
        </div>
      </div>

      {/* Back: Clean recipe */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-2xl border-2 border-emerald-400 p-8 transition-all duration-500 ease-out cursor-pointer ${
          swapped 
            ? 'translate-y-0 rotate-0 opacity-100 hover:shadow-3xl' 
            : 'translate-y-8 rotate-2 opacity-0 pointer-events-none'
        }`}
        onClick={() => setSwapped(false)}
        aria-hidden={!swapped}
      >
        <div className="flex items-center gap-2 text-emerald-600 mb-4">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Just the recipe</span>
        </div>
        <h4 className="font-bold text-gray-900 mb-4 text-xl">Weeknight Lasagna</h4>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              Ingredients
            </div>
            <ul className="space-y-1.5 text-gray-600">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Pasta sheets</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Tomato sauce</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Mozzarella</span>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Steps
            </div>
            <ol className="space-y-1.5 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-500">1.</span>
                <span>Layer ingredients</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-500">2.</span>
                <span>Bake 35 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-500">3.</span>
                <span>Serve hot</span>
              </li>
            </ol>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-emerald-200 flex items-center justify-between">
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" /> 45 min
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              <Users className="w-3 h-3" /> 4 servings
            </span>
          </div>
          <span className="text-xs text-gray-400">Click to go back</span>
        </div>
      </div>
    </div>
  );
}

// Enhanced folder preview
function FolderPreview() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 flex items-center px-6 text-white">
          <FolderIcon className="w-5 h-5 mr-3" />
          <span className="font-bold text-lg">Saved Recipes</span>
          <div className="ml-auto bg-white/25 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm">
            124 recipes
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[ 
              { title: 'Smash Burgers', source: 'Food Network', color: 'from-red-400 to-orange-500' },
              { title: 'Lemon Drizzle Cake', source: 'AllRecipes', color: 'from-yellow-400 to-orange-400' },
              { title: 'Crispy Tofu', source: 'Serious Eats', color: 'from-green-400 to-emerald-500' },
              { title: 'One-Pot Pasta', source: 'Bon Appétit', color: 'from-blue-400 to-indigo-500' }
            ].map((recipe, i) => (
              <div 
                key={i} 
                className={`border-2 rounded-xl p-4 transition-all duration-300 cursor-pointer ${
                  hoveredIndex === i 
                    ? 'border-purple-400 shadow-lg -translate-y-1 bg-purple-50/50' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className={`h-1.5 bg-gradient-to-r ${recipe.color} rounded-full mb-3`} />
                <div className="text-sm font-bold text-gray-900 mb-1 leading-tight">{recipe.title}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <BookMarked className="w-3 h-3" />
                  {recipe.source}
                </div>
              </div>
            ))}
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl">
            <Globe className="w-5 h-5" />
            Open Web App
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Stats counter animation
function StatCounter({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F4D35E] via-[#EE964B] to-[#F95738]">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-8">
              <img 
                src="/logo.png" 
                alt="Get The Recipe!" 
                className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-lg" 
              />
              <SplitText 
                text="Get The Recipe!" 
                className="text-5xl md:text-7xl font-black text-white drop-shadow-lg" 
              />
            </div>
            
            <p className="text-2xl md:text-3xl text-white font-semibold mb-4 drop-shadow-md">
              Skip the life story. Get straight to cooking.
            </p>
            
            <p className="text-lg md:text-xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              Transform any recipe URL into a clean, organized format instantly. No more scrolling through endless blog posts to find the ingredients.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="group px-10 py-5 bg-white text-gray-900 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-3"
              >
                <Globe className="w-6 h-6" />
                Try It Free Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <a
                href="#download"
                className="px-10 py-5 border-3 border-white text-white rounded-2xl font-bold text-lg hover:bg-white hover:text-[#EE964B] transition-all shadow-xl flex items-center gap-3"
              >
                <Smartphone className="w-6 h-6" />
                Get Mobile App
              </a>
            </div>

            <p className="mt-8 text-white/90 text-sm font-medium">
              ✨ No signup required • 🚀 Works instantly • 💯 100% free
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white border-y border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Recipes Parsed', value: 50000, suffix: '+', icon: Search },
              { label: 'Happy Cooks', value: 12500, suffix: '+', icon: Users },
              { label: 'Time Saved', value: 1000, suffix: 'hrs', icon: Clock },
              { label: 'Success Rate', value: 99, suffix: '%', icon: TrendingUp }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">
                  <StatCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold mb-4">
              THE PROBLEM
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              I came for lasagna,<br />not your life story
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We all know the drill: You're hungry, you click a recipe link, and suddenly you're reading a 2,000-word essay about someone's childhood memories.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side: CardSwap */}
            <div className="space-y-6">
              <CardSwap />
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Click or hover to see the difference
                </p>
              </div>
            </div>
            
            {/* Right side: Solution box + Folder preview stacked */}
            <div className="space-y-8">
              {/* Solution Box */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border-2 border-emerald-300 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">The Solution</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Paste any recipe URL',
                    'We extract only what matters',
                    'Get clean ingredients & steps',
                    'Save to your personal collection',
                    'Access offline anytime'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Folder Preview */}
              <FolderPreview />
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-4">
              FEATURES
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Everything you need to cook better
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make your cooking experience seamless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: 'Instant Parsing',
                description: 'Extract recipes from any website in seconds. Supports thousands of recipe sites.',
                color: 'blue'
              },
              {
                icon: BookMarked,
                title: 'Smart Organization',
                description: 'Save and categorize your favorite recipes. Create custom collections.',
                color: 'purple'
              },
              {
                icon: Globe,
                title: 'Works Everywhere',
                description: 'Access your recipes on any device. Web, iOS, and Android apps.',
                color: 'green'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'No waiting, no loading screens. Get your recipes instantly.',
                color: 'yellow'
              },
              {
                icon: Shield,
                title: 'Privacy First',
                description: 'Your recipes are yours. We never share your data with anyone.',
                color: 'red'
              },
              {
                icon: Star,
                title: 'Smart Features',
                description: 'Measurement conversion, scaling, timer integration, and more.',
                color: 'pink'
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border-2 border-gray-200 hover:border-gray-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-14 h-14 bg-gradient-to-br from-${feature.color}-400 to-${feature.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-[#F4D35E] via-[#EE964B] to-[#F95738] py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 drop-shadow-lg">
            Ready to cook smarter?
          </h2>
          <p className="text-xl text-white/95 mb-12 leading-relaxed drop-shadow">
            Join thousands of home cooks who've already ditched the blog scroll. Start parsing recipes in seconds.
          </p>
          
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-gray-900 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all shadow-2xl hover:shadow-3xl hover:scale-105"
          >
            <Globe className="w-7 h-7" />
            Launch Web App Now
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="mt-8 text-white/90 text-sm font-medium">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </div>

      {/* Download Section */}
      <div id="download" className="bg-gray-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Get The Mobile App
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Take your recipes with you. Download for iOS and Android to cook offline and sync across all your devices.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <a
                href="https://apps.apple.com/app/get-the-recipe"
                className="group bg-white text-gray-900 px-10 py-5 rounded-2xl flex items-center gap-4 hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Download className="w-7 h-7" />
                <div className="text-left">
                  <div className="text-xs text-gray-600">Download on the</div>
                  <div className="text-xl font-bold">App Store</div>
                </div>
              </a>

              <a
                href="https://play.google.com/store/apps/details?id=com.gettherecipe"
                className="group bg-white text-gray-900 px-10 py-5 rounded-2xl flex items-center gap-4 hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Download className="w-7 h-7" />
                <div className="text-left">
                  <div className="text-xs text-gray-600">Get it on</div>
                  <div className="text-xl font-bold">Google Play</div>
                </div>
              </a>
            </div>

            <p className="text-gray-400 text-sm">
              Coming soon to App Store and Google Play
            </p>
          </div>

          {/* App Preview Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-700">
              <div className="bg-gradient-to-r from-[#EE964B] to-[#F95738] h-2 rounded-full mb-6"></div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Classic Chocolate Brownies
              </h3>
              <p className="text-gray-400 italic mb-6">from AllRecipes</p>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm font-semibold text-blue-300">16 servings</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full border border-green-500/30">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-300">15 mins prep</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full border border-orange-500/30">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-300">45 mins cook</span>
                </div>
              </div>
              
              <div className="text-gray-300 flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <strong className="text-white">10</strong> ingredients
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-blue-400" />
                  <strong className="text-white">6</strong> steps
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <img 
                src="/logo.png" 
                alt="Get The Recipe!" 
                className="w-12 h-12 object-contain" 
              />
              <h3 className="text-2xl font-black text-white">Get The Recipe!</h3>
            </div>
            
            <p className="text-gray-400 mb-8 text-lg">
              Making cooking easier, one recipe at a time.
            </p>
            
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#EE964B] to-[#F95738] text-white rounded-xl font-bold text-lg hover:from-[#F95738] hover:to-[#EE964B] transition-all shadow-lg hover:shadow-xl"
            >
              <Globe className="w-6 h-6" />
              Start Cooking Better
              <Sparkles className="w-5 h-5" />
            </button>

            <div className="mt-12 pt-8 border-t border-gray-800">
              <p className="text-gray-500 text-sm">
                © 2024 Get The Recipe. All rights reserved. Made with ❤️ for home cooks everywhere.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}