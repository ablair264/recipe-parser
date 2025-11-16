import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Smartphone, Globe, Star, Clock, Download, ArrowRight, Check, Sparkles, Zap, Search, BookMarked, ShoppingCart, Users, X } from 'lucide-react';

// Staggered fade-in animation component
function FadeIn({ children, delay = 0, className = '' }) {
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

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Interactive recipe card with dramatic flip
function RecipeCardFlip() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative w-full max-w-md mx-auto h-[500px] perspective-1000">
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front: Messy Blog Post */}
        <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'pointer-events-none' : ''}`}>
          <div className="w-full h-full bg-white rounded-3xl shadow-2xl border-4 border-gray-200 p-8 overflow-hidden relative">
            {/* Noise texture overlay */}
            <div className="absolute inset-0 opacity-5 mix-blend-multiply"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <div className="relative">
              <div className="flex items-center gap-2 text-charcoal-400 mb-4 text-sm font-bold uppercase tracking-wider">
                <div className="w-3 h-3 bg-orange rotate-45"></div>
                GRANDMA'S COOKING BLOG
              </div>

              <h3 className="font-serif text-3xl font-bold text-charcoal mb-4 leading-tight">
                The Story Behind My Famous<br />Chocolate Chip Cookies
              </h3>

              <div className="space-y-3 text-gray-600 leading-relaxed">
                <p className="text-sm">
                  It was a crisp autumn morning in 1987 when my grandmother first taught me the secret to perfect chocolate chip cookies...
                </p>
                <div className="space-y-2 opacity-60">
                  <div className="h-2 bg-gray-200 rounded-full w-full animate-pulse"></div>
                  <div className="h-2 bg-gray-200 rounded-full w-5/6 animate-pulse"></div>
                  <div className="h-2 bg-gray-200 rounded-full w-4/6 animate-pulse"></div>
                </div>

                {/* Fake ads */}
                <div className="border-2 border-red-300 bg-red-50 p-3 rounded-lg my-4">
                  <p className="text-xs text-red-600 font-bold">ADVERTISEMENT</p>
                </div>

                <p className="text-sm italic text-gray-400 border-l-4 border-gray-300 pl-3">
                  Subscribe to my newsletter! Learn about my cat, my garden, and occasionally... recipes.
                </p>
              </div>

              <div className="absolute bottom-4 right-4 bg-charcoal text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse">
                Scroll 2000 more words ↓
              </div>
            </div>
          </div>
        </div>

        {/* Back: Clean Recipe */}
        <div className={`absolute inset-0 backface-hidden rotate-y-180 ${!isFlipped ? 'pointer-events-none' : ''}`}>
          <div className="w-full h-full bg-gradient-to-br from-hunyadi-50 to-orange-50 rounded-3xl shadow-2xl border-4 border-hunyadi p-8 relative overflow-hidden">
            {/* Decorative circle */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange/10 rounded-full blur-3xl"></div>

            <div className="relative">
              <div className="flex items-center gap-2 text-orange mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Just The Recipe</span>
              </div>

              <h3 className="font-serif text-3xl font-bold text-charcoal mb-6">
                Chocolate Chip Cookies
              </h3>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-bold text-charcoal mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange rounded-full"></div>
                    Ingredients
                  </h4>
                  <ul className="space-y-2 text-sm text-charcoal-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                      2 cups flour
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                      1 cup butter
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-orange mt-0.5 flex-shrink-0" />
                      2 cups chocolate
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-charcoal mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-lapis rounded-full"></div>
                    Steps
                  </h4>
                  <ol className="space-y-2 text-sm text-charcoal-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lapis">1.</span>
                      Mix ingredients
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lapis">2.</span>
                      Bake 12 min
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-lapis">3.</span>
                      Enjoy!
                    </li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs pt-4 border-t-2 border-hunyadi-200">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 30 min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> 24 cookies
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-carolina-100/30 relative overflow-hidden font-sans">
      {/* Add custom fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Karla:wght@400;500;600;700;800&display=swap');

        .font-serif { font-family: 'DM Serif Display', serif; }
        .font-sans { font-family: 'Karla', sans-serif; }

        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        /* Noise texture */
        .noise-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Hero Section - Asymmetric & Bold */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 noise-texture opacity-[0.03]"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-hunyadi/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Bold Typography */}
          <FadeIn delay={0}>
            <div className="relative">
              {/* Logo */}
              <div className="mb-8 flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Get The Recipe!"
                  className="w-20 h-20 object-contain drop-shadow-lg"
                />
                <div className="w-1 h-16 bg-gradient-to-b from-hunyadi to-orange rounded-full"></div>
              </div>

              {/* Oversized headline with asymmetric layout */}
              <div className="space-y-6">
                <div className="relative">
                  <h1 className="font-serif text-7xl lg:text-8xl font-bold text-charcoal leading-[0.95] tracking-tight">
                    Skip the
                    <span className="block italic text-orange mt-2 relative">
                      life story
                      <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-32 h-1 bg-orange transform rotate-12"></div>
                    </span>
                  </h1>
                </div>

                <p className="text-2xl lg:text-3xl font-bold text-lapis max-w-md leading-snug">
                  Get straight to cooking.
                </p>

                <p className="text-lg text-charcoal-600 max-w-lg leading-relaxed">
                  Transform any recipe blog into a clean, beautiful recipe card. No ads. No essays. No faff. Just ingredients and steps.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <button
                  onClick={onGetStarted}
                  className="group relative px-8 py-4 bg-gradient-to-br from-hunyadi to-orange text-charcoal font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <span className="relative flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Try It Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <a
                  href="#features"
                  className="px-8 py-4 border-3 border-charcoal text-charcoal font-bold text-lg rounded-2xl hover:bg-charcoal hover:text-white transition-all duration-300"
                >
                  See How It Works
                </a>
              </div>

              {/* Stats - Inline */}
              <div className="flex gap-8 mt-12 pt-8 border-t-2 border-charcoal/10">
                <div>
                  <div className="text-4xl font-black text-hunyadi font-serif">50k+</div>
                  <div className="text-sm text-charcoal-600 font-medium">Recipes Parsed</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-orange font-serif">99%</div>
                  <div className="text-sm text-charcoal-600 font-medium">Success Rate</div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Right: Interactive Card */}
          <FadeIn delay={200}>
            <div className="relative">
              <RecipeCardFlip />
              <p className="text-center mt-6 text-charcoal-600 font-medium">
                Click the card to see the magic ✨
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Diagonal Separator */}
      <div className="relative h-32 bg-gradient-to-br from-charcoal to-charcoal-700 transform -skew-y-2 origin-top-left shadow-2xl"></div>

      {/* Problem Section - Dark Background */}
      <section id="features" className="relative bg-gradient-to-br from-charcoal-800 via-charcoal to-lapis-900 py-32 -mt-16">
        <div className="absolute inset-0 noise-texture opacity-10"></div>

        <div className="relative max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <div className="inline-block px-6 py-3 bg-orange rounded-full mb-6">
                <span className="text-sm font-bold text-white uppercase tracking-wider">The Problem</span>
              </div>

              <h2 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                We've all been there
              </h2>

              <p className="text-xl lg:text-2xl text-carolina-200 max-w-3xl mx-auto leading-relaxed">
                You search for a recipe. Click the link. Then suffer through someone's entire childhood before finding the actual ingredients.
              </p>
            </div>
          </FadeIn>

          {/* Problems Grid - Asymmetric */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: '📚', title: '2,000 Word Essays', desc: 'About grandma, cats, and that one time in Tuscany' },
              { icon: '📱', title: 'Endless Ads', desc: 'Pop-ups, videos, and "Subscribe to my newsletter!"' },
              { icon: '⏱️', title: 'Wasted Time', desc: 'Scrolling for 5 minutes just to find the ingredients' }
            ].map((problem, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                  <div className="text-5xl mb-4">{problem.icon}</div>
                  <h3 className="font-bold text-xl text-white mb-3">{problem.title}</h3>
                  <p className="text-carolina-200 leading-relaxed">{problem.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section - Light Background with Diagonal Entry */}
      <div className="relative h-32 bg-gradient-to-br from-hunyadi-50 to-orange-50 transform skew-y-2 origin-top-left -mt-16"></div>

      <section className="relative bg-gradient-to-br from-hunyadi-50 to-orange-50 py-32 -mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-lapis to-carolina rounded-full mb-6">
                <span className="text-sm font-bold text-white uppercase tracking-wider">The Solution</span>
              </div>

              <h2 className="font-serif text-5xl lg:text-7xl font-bold text-charcoal mb-6 leading-tight">
                Just paste & parse
              </h2>
            </div>
          </FadeIn>

          {/* Steps - Large, Bold Numbers */}
          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              { num: '01', icon: Search, title: 'Find Recipe', desc: 'Copy the URL from any recipe blog or website' },
              { num: '02', icon: Zap, title: 'Instant Parse', desc: 'Our AI extracts ingredients and steps in seconds' },
              { num: '03', icon: BookMarked, title: 'Save & Cook', desc: 'Beautiful, clean recipe cards ready to use' }
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="relative group">
                  {/* Large background number */}
                  <div className="absolute -top-8 -left-4 font-serif text-[140px] font-bold text-hunyadi/10 select-none group-hover:text-hunyadi/20 transition-colors">
                    {step.num}
                  </div>

                  <div className="relative bg-white rounded-3xl p-8 shadow-xl border-4 border-charcoal/5 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-hunyadi to-orange rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="font-bold text-2xl text-charcoal mb-3">{step.title}</h3>
                    <p className="text-charcoal-600 leading-relaxed text-lg">{step.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Grid with Overlap */}
      <section className="relative bg-white py-32">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <h2 className="font-serif text-5xl lg:text-6xl font-bold text-charcoal mb-6">
                Designed for<br />
                <span className="text-lapis italic">real cooking</span>
              </h2>
            </div>
          </FadeIn>

          {/* Features in asymmetric layout */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: 'Works Everywhere', desc: 'Web, iOS, and Android apps', color: 'from-lapis to-carolina' },
              { icon: ShoppingCart, title: 'Pantry Tracker', desc: 'Know what you have at home', color: 'from-hunyadi to-orange' },
              { icon: Clock, title: 'Cooking Mode', desc: 'Hands-free step-by-step guide', color: 'from-orange to-hunyadi' },
              { icon: Sparkles, title: 'Smart Parsing', desc: 'AI extracts perfect recipes', color: 'from-carolina to-lapis' },
              { icon: Download, title: 'Offline Access', desc: 'Cook without internet', color: 'from-charcoal to-lapis' },
              { icon: Star, title: 'Collections', desc: 'Organize your favorites', color: 'from-orange to-orange-700' }
            ].map((feature, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="group relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-3xl p-8 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  {/* Hover gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                  <div className="relative">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="font-bold text-xl text-charcoal mb-3">{feature.title}</h3>
                    <p className="text-charcoal-600 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Bold & Diagonal */}
      <section className="relative bg-gradient-to-br from-charcoal via-lapis-900 to-charcoal-900 py-32 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-hunyadi/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange/20 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 noise-texture opacity-10"></div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="mb-12">
              <h2 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight">
                Ready to cook<br />
                <span className="italic text-hunyadi">without the faff?</span>
              </h2>

              <p className="text-xl lg:text-2xl text-carolina-200 max-w-3xl mx-auto leading-relaxed mb-12">
                Join thousands of home cooks who've ditched the blog scroll. Start parsing recipes in seconds.
              </p>
            </div>

            <button
              onClick={onGetStarted}
              className="group relative px-12 py-6 bg-gradient-to-r from-hunyadi via-orange to-hunyadi text-charcoal font-black text-2xl rounded-full shadow-2xl hover:shadow-hunyadi/50 transition-all duration-300 hover:scale-105 bg-size-200 hover:bg-right"
              style={{ backgroundSize: '200% 100%' }}
            >
              <span className="flex items-center gap-3">
                <Sparkles className="w-7 h-7" />
                Start Cooking Better
                <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
              </span>
            </button>

            <p className="mt-8 text-carolina-300 font-medium">
              Free forever • No credit card • No faff
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Download Section */}
      <section className="relative bg-gradient-to-br from-gray-50 to-carolina-50 py-32">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-lapis rounded-full mb-6">
                <Smartphone className="w-5 h-5 text-white" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">Mobile Apps</span>
              </div>

              <h2 className="font-serif text-5xl lg:text-6xl font-bold text-charcoal mb-6">
                Take your recipes<br />
                <span className="italic text-orange">everywhere</span>
              </h2>

              <p className="text-xl text-charcoal-600 max-w-2xl mx-auto mb-12">
                Download the Defaff Recipes app for iOS and Android. Cook offline, track your pantry, and access your collection anywhere.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a
                  href="https://apps.apple.com/app/get-the-recipe"
                  className="group bg-charcoal text-white px-10 py-5 rounded-2xl flex items-center gap-4 hover:bg-charcoal-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <Download className="w-7 h-7" />
                  <div className="text-left">
                    <div className="text-xs text-carolina-300">Download on the</div>
                    <div className="text-xl font-bold">App Store</div>
                  </div>
                </a>

                <div className="group bg-gray-300 text-gray-500 px-10 py-5 rounded-2xl flex items-center gap-4 cursor-not-allowed opacity-60">
                  <Download className="w-7 h-7" />
                  <div className="text-left">
                    <div className="text-xs">Coming Soon</div>
                    <div className="text-xl font-bold">Google Play</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal-900 py-16 border-t-4 border-hunyadi">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Get The Recipe!"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h3 className="font-serif text-2xl font-bold text-white">Get The Recipe!</h3>
                <p className="text-carolina-300 text-sm">No faff. Just food.</p>
              </div>
            </div>

            <div className="flex gap-8 text-sm">
              <a href="/privacy" className="text-carolina-300 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-carolina-300 hover:text-white transition-colors">
                Terms
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-charcoal-700 text-center">
            <p className="text-carolina-400 text-sm">
              © 2024 Get The Recipe. Made with ❤️ for home cooks everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
