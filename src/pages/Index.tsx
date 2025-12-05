import { useState, useEffect } from 'react';
import { Lightbulb, SlidersHorizontal, Box, Zap, Palette, BarChart3, Languages, Camera, Film, ShoppingBag, Play, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LightingCanvas from '@/components/LightingCanvas';

const Index = () => {
  const [scrolled, setScrolled] = useState(false);
  const [keyIntensity, setKeyIntensity] = useState(80);
  const [fillIntensity, setFillIntensity] = useState(40);
  const [colorTemp, setColorTemp] = useState(5600);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ratio = (keyIntensity / Math.max(fillIntensity, 10)).toFixed(1);
  const lightingStyle = parseFloat(ratio) >= 4 ? 'Dramatic' : parseFloat(ratio) >= 2 ? 'Classical Portrait' : 'Soft Lighting';
  const rating = parseFloat(ratio) >= 2 && parseFloat(ratio) <= 4 ? 8.5 : parseFloat(ratio) > 4 ? 7.0 : 6.0;

  const features = [
    { icon: SlidersHorizontal, title: 'Precise Parameter Control', desc: 'Adjust intensity, color temperature, softness, and direction with professional-grade accuracy.' },
    { icon: Box, title: '3D Lighting Visualization', desc: 'See exactly how your lighting setup will look before generation with real-time 3D preview.' },
    { icon: Zap, title: 'FIBO JSON-Native Integration', desc: "Leverage BRIA FIBO's structured JSON generation for deterministic, reproducible results." },
    { icon: Palette, title: 'Professional Presets', desc: 'Start with proven lighting setups like Rembrandt, Butterfly, and Loop lighting.' },
    { icon: BarChart3, title: 'Lighting Analysis', desc: 'Get real-time feedback on key-to-fill ratios, contrast scores, and professional ratings.' },
    { icon: Languages, title: 'Natural Language Control', desc: 'Use simple commands like "softer fill light" and let AI translate to precise parameters.' },
  ];

  const useCases = [
    { icon: Camera, title: 'Photographers', desc: 'Plan shoots and test lighting setups without expensive equipment rentals.' },
    { icon: Film, title: 'Filmmakers', desc: 'Pre-visualize scenes and create lighting storyboards for your productions.' },
    { icon: ShoppingBag, title: 'E-commerce', desc: 'Create consistent product photography with perfectly controlled lighting.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 px-[5%] py-6 flex justify-between items-center transition-all duration-300 ${scrolled ? 'py-4 bg-background/95 backdrop-blur-xl shadow-lg' : 'bg-background/80 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3 font-bold text-xl">
          <Lightbulb className="text-secondary" />
          <span>ProLighting</span>
        </div>
        <nav className="hidden md:flex gap-8">
          {['Features', 'Demo', 'Technology', 'Use Cases'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="font-medium hover:text-secondary transition-colors relative after:content-[''] after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-0.5 after:bg-secondary after:transition-all hover:after:w-full">
              {item}
            </a>
          ))}
        </nav>
        <Button className="hidden md:flex gradient-primary rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          Try Demo
        </Button>
        <Menu className="md:hidden cursor-pointer" />
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center px-[5%] pt-20 relative">
        <div className="max-w-xl z-10 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 gradient-text">
            Revolutionize Your Photography with AI-Powered Lighting Simulation
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Create perfect studio lighting setups in seconds using FIBO's JSON-native AI technology. No equipment, no guesswork, just professional results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="gradient-primary rounded-full animate-pulse-glow">
              <Zap className="mr-2 h-5 w-5" /> Launch Simulator
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-muted-foreground/30 hover:border-primary hover:text-primary">
              <Play className="mr-2 h-5 w-5" /> Watch Demo
            </Button>
          </div>
        </div>
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 w-1/2 max-w-[600px] h-[500px] hidden lg:block">
          <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden">
            <LightingCanvas keyIntensity={keyIntensity / 100} fillIntensity={fillIntensity / 100} colorTemp={colorTemp} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-[5%]">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Professional Lighting Control at Your Fingertips</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Our simulator combines photographic expertise with cutting-edge AI for unprecedented creative control</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="glass-card p-8 hover:-translate-y-2 hover:bg-card/80 transition-all duration-300 hover:shadow-xl">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-24 px-[5%] bg-card/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Interactive Lighting Demo</h2>
          <p className="text-lg text-muted-foreground">See how easy it is to create professional lighting setups</p>
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 w-full">
            <h3 className="text-2xl font-semibold mb-4">Real-time Lighting Control</h3>
            <p className="text-muted-foreground mb-8">Adjust the parameters below to see how different lighting setups affect your scene.</p>
            
            {[
              { label: 'Key Light Intensity', value: keyIntensity, setValue: setKeyIntensity, unit: '%', max: 100 },
              { label: 'Fill Light Intensity', value: fillIntensity, setValue: setFillIntensity, unit: '%', max: 100 },
              { label: 'Color Temperature', value: colorTemp, setValue: setColorTemp, unit: 'K', max: 10000, min: 2500 },
            ].map((slider) => (
              <div key={slider.label} className="mb-6">
                <div className="flex justify-between mb-2">
                  <span>{slider.label}</span>
                  <span className="text-primary">{slider.value}{slider.unit}</span>
                </div>
                <input
                  type="range"
                  min={slider.min || 0}
                  max={slider.max}
                  value={slider.value}
                  onChange={(e) => slider.setValue(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            ))}

            <div className="glass-card p-6 mt-8">
              <h4 className="font-semibold mb-4">Lighting Analysis</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Key/Fill Ratio:</span><span className="text-secondary">{ratio}:1</span></div>
                <div className="flex justify-between"><span>Lighting Style:</span><span className="text-secondary">{lightingStyle}</span></div>
                <div className="flex justify-between"><span>Professional Rating:</span><span className="text-secondary">{rating.toFixed(1)}/10</span></div>
              </div>
            </div>
          </div>
          <div className="flex-1 h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl bg-background">
            <LightingCanvas keyIntensity={keyIntensity / 100} fillIntensity={fillIntensity / 100} colorTemp={colorTemp} />
          </div>
        </div>
      </section>

      {/* Technology */}
      <section id="technology" className="py-24 px-[5%] text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by FIBO's JSON-Native AI</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">Our simulator leverages BRIA FIBO's revolutionary architecture for deterministic control</p>
        
        <div className="glass-card p-8 max-w-3xl mx-auto text-left overflow-x-auto">
          <pre className="text-sm text-primary font-mono whitespace-pre-wrap">{`{
  "lighting": {
    "main_light": {
      "direction": "45 degrees camera-right",
      "intensity": 0.8,
      "color_temperature": 5600,
      "softness": 0.5
    },
    "fill_light": {
      "direction": "30 degrees camera-left",
      "intensity": 0.4,
      "softness": 0.7
    },
    "rim_light": {
      "direction": "behind subject left",
      "intensity": 0.6,
      "color_temperature": 3200
    }
  }
}`}</pre>
        </div>
        <p className="text-muted-foreground mt-8 mb-6">Unlike traditional AI image generators, FIBO uses structured JSON prompts for precise, reproducible control.</p>
        <Button className="gradient-primary rounded-full">Explore FIBO Technology</Button>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-24 px-[5%]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perfect For Creative Professionals</h2>
          <p className="text-lg text-muted-foreground">Whether you're a photographer, filmmaker, or content creator</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((item, i) => (
            <div key={i} className="glass-card p-8 hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6">
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-[5%] mb-24 gradient-primary rounded-3xl py-16 px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Creative Workflow?</h2>
        <p className="text-lg max-w-2xl mx-auto mb-8 opacity-90">Join thousands of photographers and creators using Pro Lighting Simulator to create stunning images with AI-powered precision.</p>
        <Button size="lg" className="bg-foreground text-primary hover:bg-foreground/90 rounded-full">
          <Zap className="mr-2 h-5 w-5" /> Launch Pro Lighting Simulator
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-background py-16 px-[5%] border-t border-border">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 font-bold text-xl mb-4">
              <Lightbulb className="text-secondary" />
              <span>ProLighting</span>
            </div>
            <p className="text-muted-foreground text-sm">The future of AI-powered photography pre-production.</p>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Use Cases', 'Pricing', 'Documentation'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="font-semibold mb-4 relative after:content-[''] after:absolute after:bottom-[-8px] after:left-0 after:w-10 after:h-0.5 after:bg-primary">{col.title}</h3>
              <ul className="space-y-3 mt-6">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-muted-foreground hover:text-primary transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center pt-8 border-t border-border text-muted-foreground text-sm">
          &copy; 2024 Pro Lighting Simulator. Built for the FIBO Hackathon. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
