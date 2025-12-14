import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, SlidersHorizontal, Box, Zap, Palette, BarChart3, Languages, Camera, Film, ShoppingBag, Play, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import LightingCanvas from '@/components/LightingCanvas';
import FiboBadge from '@/components/hero/FiboBadge';
import StatsCounter from '@/components/hero/StatsCounter';
import AnimatedBackground from '@/components/hero/AnimatedBackground';

const Index = () => {
  const [keyIntensity, setKeyIntensity] = useState(80);
  const [fillIntensity, setFillIntensity] = useState(40);
  const [colorTemp, setColorTemp] = useState(5600);

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

  const comparisonData = [
    { feature: 'Lighting Control', prolight: 'Precise JSON parameters', traditional: 'Text descriptions' },
    { feature: 'Reproducibility', prolight: '100% deterministic', traditional: 'Random each time' },
    { feature: 'Cost per Image', prolight: '$0.04', traditional: '$0.50+' },
    { feature: 'Generation Speed', prolight: '< 3 seconds', traditional: '10-30 seconds' },
  ];

  return (
    <div className="min-h-screen pt-20 overflow-hidden">
      <FiboBadge />
      
      {/* Hero */}
      <section className="min-h-[calc(100vh-5rem)] flex items-center px-[5%] relative">
        <AnimatedBackground />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="fibo-badge inline-flex items-center gap-2 mb-6"
          >
            <Zap className="w-3 h-3 text-secondary" />
            <span>FIBO Hackathon 2024</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            <span className="text-foreground">Precision Lighting</span>
            <br />
            <span className="gradient-text">Powered by FIBO</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Create perfect studio lighting setups in seconds using FIBO's JSON-native AI technology. 
            <span className="text-foreground font-medium"> No equipment, no guesswork, just professional results.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/studio">
              <Button size="lg" className="gradient-fibo rounded-full animate-pulse-glow group">
                <Zap className="mr-2 h-5 w-5" /> 
                Launch Simulator
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="rounded-full border-muted-foreground/30 hover:border-primary hover:text-primary backdrop-blur-sm">
                <Play className="mr-2 h-5 w-5" /> Watch Demo
              </Button>
            </a>
          </div>
          
          <StatsCounter />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute right-[5%] top-1/2 -translate-y-1/2 w-1/2 max-w-[600px] h-[500px] hidden lg:block"
        >
          <div className="w-full h-full rounded-3xl shadow-2xl overflow-hidden glass-card-premium">
            <LightingCanvas keyIntensity={keyIntensity / 100} fillIntensity={fillIntensity / 100} colorTemp={colorTemp} />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-[5%] relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Professional Lighting Control at Your Fingertips</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Our simulator combines photographic expertise with cutting-edge AI for unprecedented creative control</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-premium p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl gradient-fibo flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-24 px-[5%] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Interactive Lighting Demo</h2>
          <p className="text-lg text-muted-foreground">See how easy it is to create professional lighting setups</p>
        </motion.div>
        
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 w-full"
          >
            <h3 className="text-2xl font-semibold mb-4">Real-time Lighting Control</h3>
            <p className="text-muted-foreground mb-8">Adjust the parameters below to see how different lighting setups affect your scene.</p>
            
            {[
              { label: 'Key Light Intensity', value: keyIntensity, setValue: setKeyIntensity, unit: '%', max: 100 },
              { label: 'Fill Light Intensity', value: fillIntensity, setValue: setFillIntensity, unit: '%', max: 100 },
              { label: 'Color Temperature', value: colorTemp, setValue: setColorTemp, unit: 'K', max: 10000, min: 2500 },
            ].map((slider) => (
              <div key={slider.label} className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{slider.label}</span>
                  <span className="text-primary font-bold">{slider.value}{slider.unit}</span>
                </div>
                <input
                  type="range"
                  min={slider.min || 0}
                  max={slider.max}
                  value={slider.value}
                  onChange={(e) => slider.setValue(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30"
                />
              </div>
            ))}

            <div className="glass-card-premium p-6 mt-8">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Lighting Analysis
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Key/Fill Ratio:</span><span className="text-secondary font-bold">{ratio}:1</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lighting Style:</span><span className="text-secondary font-bold">{lightingStyle}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Professional Rating:</span><span className="text-secondary font-bold">{rating.toFixed(1)}/10</span></div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1 h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl glass-card-premium"
          >
            <LightingCanvas keyIntensity={keyIntensity / 100} fillIntensity={fillIntensity / 100} colorTemp={colorTemp} />
          </motion.div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 px-[5%]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ProLight AI vs Traditional</h2>
          <p className="text-lg text-muted-foreground">See the difference FIBO makes</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card-premium p-8 max-w-3xl mx-auto overflow-hidden"
        >
          <div className="grid grid-cols-3 gap-4 text-center mb-4 pb-4 border-b border-border/30">
            <div className="text-muted-foreground text-sm font-medium">Feature</div>
            <div className="gradient-text font-bold">ProLight AI</div>
            <div className="text-muted-foreground">Traditional</div>
          </div>
          {comparisonData.map((row, i) => (
            <motion.div 
              key={row.feature}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="grid grid-cols-3 gap-4 text-center py-4 border-b border-border/10 last:border-0"
            >
              <div className="text-muted-foreground text-sm">{row.feature}</div>
              <div className="text-green-400 font-medium text-sm">{row.prolight}</div>
              <div className="text-muted-foreground text-sm">{row.traditional}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Technology */}
      <section id="technology" className="py-24 px-[5%] text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by FIBO's JSON-Native AI</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">Our simulator leverages BRIA FIBO's revolutionary architecture for deterministic control</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card-premium p-8 max-w-3xl mx-auto text-left overflow-x-auto"
        >
          <pre className="text-sm text-primary/90 font-mono whitespace-pre-wrap">{`{
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
  },
  "deterministic": true,
  "seed": 42
}`}</pre>
        </motion.div>
        <p className="text-muted-foreground mt-8 mb-6">Unlike traditional AI image generators, FIBO uses structured JSON prompts for precise, reproducible control.</p>
        <Button className="gradient-fibo rounded-full">Explore FIBO Technology</Button>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-24 px-[5%]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perfect For Creative Professionals</h2>
          <p className="text-lg text-muted-foreground">Whether you're a photographer, filmmaker, or content creator</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card-premium p-8 hover:-translate-y-2 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl gradient-fibo flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-[5%] mb-24 gradient-fibo rounded-3xl py-16 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Creative Workflow?</h2>
          <p className="text-lg max-w-2xl mx-auto mb-8 opacity-90">Join thousands of photographers and creators using Pro Lighting Simulator to create stunning images with AI-powered precision.</p>
          <Link to="/studio">
            <Button size="lg" className="bg-foreground text-primary hover:bg-foreground/90 rounded-full shadow-xl">
              <Zap className="mr-2 h-5 w-5" /> Launch Pro Lighting Simulator
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-background/80 backdrop-blur-xl py-16 px-[5%] border-t border-border/30">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 font-bold text-xl mb-4">
              <div className="w-10 h-10 rounded-xl gradient-fibo flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span>ProLight AI</span>
            </div>
            <p className="text-muted-foreground text-sm">The future of AI-powered photography pre-production. Built for the FIBO Hackathon.</p>
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
        <div className="text-center pt-8 border-t border-border/30 text-muted-foreground text-sm">
          &copy; 2024 ProLight AI. Built for the FIBO Hackathon. Powered by Bria AI.
        </div>
      </footer>
    </div>
  );
};

export default Index;
