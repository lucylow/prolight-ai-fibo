import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, SlidersHorizontal, Box, Zap, Palette, BarChart3, Languages, Camera, Film, ShoppingBag, Play, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LightingCanvas from '@/components/LightingCanvas';

const IndexImproved = () => {
  const [keyIntensity, setKeyIntensity] = useState(80);
  const [fillIntensity, setFillIntensity] = useState(40);
  const [colorTemp, setColorTemp] = useState(5600);

  const ratio = (keyIntensity / Math.max(fillIntensity, 10)).toFixed(1);
  const lightingStyle = parseFloat(ratio) >= 4 ? 'Dramatic' : parseFloat(ratio) >= 2 ? 'Classical Portrait' : 'Soft Lighting';

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

  const stats = [
    { value: '12,500x', label: 'Cost Reduction', desc: '$500 → $0.04 per image' },
    { value: '240x', label: 'Faster', desc: '2 hours → 30 seconds' },
    { value: '100%', label: 'Reproducible', desc: 'Deterministic results' },
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="min-h-[calc(100vh-5rem)] flex items-center px-[5%] relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient" />
        
        <div className="max-w-2xl z-10 animate-fade-in-up">
          <Badge className="mb-4 text-sm px-4 py-2" variant="secondary">
            <Sparkles className="w-3 h-3 mr-2" />
            Powered by BRIA FIBO
          </Badge>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            <span className="gradient-text">Precision Lighting,</span>
            <br />
            <span className="text-foreground">Powered by AI</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Create perfect studio lighting setups in seconds using FIBO's JSON-native AI technology. 
            <span className="text-foreground font-semibold"> No equipment, no guesswork, just professional results.</span>
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm font-semibold text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/agentic-workflow">
              <Button size="lg" className="gradient-primary rounded-full animate-pulse-glow group">
                <Sparkles className="mr-2 h-5 w-5" /> 
                Try Agentic AI
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/studio">
              <Button size="lg" variant="outline" className="rounded-full border-2">
                <Zap className="mr-2 h-5 w-5" /> 
                Launch Studio
              </Button>
            </Link>
          </div>
        </div>

        {/* 3D Preview */}
        <div className="absolute right-[5%] top-1/2 -translate-y-1/2 w-1/2 max-w-[600px] h-[500px] hidden lg:block">
          <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border-2 border-primary/20">
            <LightingCanvas 
              keyIntensity={keyIntensity / 100} 
              fillIntensity={fillIntensity / 100} 
              colorTemp={colorTemp} 
            />
          </div>
          <div className="absolute -bottom-4 right-4 glass-card p-4">
            <div className="text-sm font-semibold mb-1">Current Setup</div>
            <div className="text-xs text-muted-foreground">{lightingStyle}</div>
            <div className="text-xs text-muted-foreground">Ratio: {ratio}:1</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-[5%] bg-muted/30">
        <div className="text-center mb-16 animate-fade-in-up">
          <Badge className="mb-4" variant="outline">
            <Zap className="w-3 h-3 mr-2" />
            Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Professional Lighting Control
            <br />
            <span className="gradient-text">at Your Fingertips</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our simulator combines photographic expertise with cutting-edge AI for unprecedented creative control
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="glass-card p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-[5%]">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="outline">
            <Camera className="w-3 h-3 mr-2" />
            Use Cases
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for <span className="gradient-text">Professionals</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From photographers to e-commerce, ProLight AI transforms creative workflows
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase, i) => (
            <div key={i} className="text-center group">
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <useCase.icon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{useCase.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-[5%] bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your
            <br />
            <span className="gradient-text">Creative Workflow?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join professionals using ProLight AI to create stunning images with deterministic lighting control
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agentic-workflow">
              <Button size="lg" className="gradient-primary rounded-full text-lg px-8">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating Now
              </Button>
            </Link>
            <Link to="/studio">
              <Button size="lg" variant="outline" className="rounded-full text-lg px-8 border-2">
                Explore Studio
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndexImproved;
