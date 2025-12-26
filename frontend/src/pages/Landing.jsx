import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Video, Palette, Headphones, ArrowRight, Star, Users } from 'lucide-react';

const Landing = () => {
  const handleGetStarted = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div data-testid="landing-page" className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-zinc-950 to-pink-600/20"></div>
        
        <nav className="relative z-10 px-6 md:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-500" />
            <span className="text-2xl font-bold gradient-text">CreativeHub</span>
          </div>
          <Button data-testid="nav-login-btn" onClick={handleGetStarted} className="rounded-full bg-indigo-600 hover:bg-indigo-700">
            Sign In
          </Button>
        </nav>

        <div className="relative z-10 px-6 md:px-12 lg:px-24 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              The Creative Marketplace
              <br />
              <span className="gradient-text">Built for Creators</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Connect with top-tier creators for video editing, thumbnails, graphics, and audio. 
              Professional quality, curated talent, seamless delivery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                data-testid="get-started-btn"
                onClick={handleGetStarted} 
                size="lg" 
                className="rounded-full px-8 py-6 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                data-testid="browse-services-btn"
                size="lg" 
                variant="outline" 
                className="rounded-full px-8 py-6 text-base font-semibold border-zinc-700 hover:bg-zinc-900"
                onClick={() => window.location.href = '/services'}
              >
                Browse Services
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center"
          >
            <div>
              <div className="text-4xl font-bold gradient-text">10K+</div>
              <div className="text-zinc-400 mt-2">Active Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text">50K+</div>
              <div className="text-zinc-400 mt-2">Projects Delivered</div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text">4.9/5</div>
              <div className="text-zinc-400 mt-2">Average Rating</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Services Section */}
      <div className="px-6 md:px-12 lg:px-24 py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
            Professional Creative Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Video, title: 'Video Editing', desc: 'Long-form, shorts, reels', color: 'indigo' },
              { icon: Palette, title: 'Graphic Design', desc: 'Thumbnails, banners, ads', color: 'pink' },
              { icon: Headphones, title: 'Audio Enhancement', desc: 'Mixing, mastering, cleanup', color: 'purple' },
              { icon: Video, title: 'Video Creation', desc: 'Motion graphics, animation', color: 'blue' },
            ].map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass-effect rounded-2xl p-8 card-hover cursor-pointer border border-zinc-800"
              >
                <service.icon className={`h-12 w-12 mb-4 text-${service.color}-500`} />
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-zinc-400">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-6 md:px-12 lg:px-24 py-24 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Browse & Select', desc: 'Explore creator portfolios and choose the perfect service tier for your needs' },
              { step: '2', title: 'Submit Brief', desc: 'Share your requirements, files, and vision. Secure payment through escrow' },
              { step: '3', title: 'Get Results', desc: 'Receive professional deliverables, request revisions, and approve final work' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600/20 text-indigo-500 font-bold text-2xl mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 md:px-12 lg:px-24 py-24 bg-zinc-950">
        <div className="max-w-4xl mx-auto text-center glass-effect rounded-3xl p-12 border border-zinc-800">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Create Something Amazing?
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            Join thousands of creators and businesses building the future of content
          </p>
          <Button 
            data-testid="cta-get-started-btn"
            onClick={handleGetStarted} 
            size="lg" 
            className="rounded-full px-12 py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30"
          >
            Get Started for Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 md:px-12 lg:px-24 py-12 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto text-center text-zinc-500">
          <p>&copy; 2025 CreativeHub. Professional Creative Services Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;