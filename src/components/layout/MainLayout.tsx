import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lightbulb, FlaskConical, MessageSquare, Palette, History, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/studio', label: 'Studio', icon: FlaskConical },
  { path: '/presets', label: 'Presets', icon: Palette },
  { path: '/natural-language', label: 'AI Chat', icon: MessageSquare },
  { path: '/history', label: 'History', icon: History },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-[5%] py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 font-bold text-xl">
            <Lightbulb className="text-secondary" />
            <span>ProLighting</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={isActive ? 'gradient-primary' : ''}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="ml-6 flex gap-4 text-sm text-gray-500">
              <Link 
                to="/product" 
                className={`hover:text-foreground transition ${location.pathname === '/product' ? 'text-foreground font-medium' : ''}`}
              >
                Product
              </Link>
              <Link 
                to="/features" 
                className={`hover:text-foreground transition ${location.pathname === '/features' ? 'text-foreground font-medium' : ''}`}
              >
                Features
              </Link>
              <Link 
                to="/use-cases" 
                className={`hover:text-foreground transition ${location.pathname === '/use-cases' ? 'text-foreground font-medium' : ''}`}
              >
                Use Cases
              </Link>
              <Link 
                to="/pricing" 
                className={`hover:text-foreground transition ${location.pathname === '/pricing' ? 'text-foreground font-medium' : ''}`}
              >
                Pricing
              </Link>
              <Link 
                to="/docs" 
                className={`hover:text-foreground transition ${location.pathname === '/docs' ? 'text-foreground font-medium' : ''}`}
              >
                Docs
              </Link>
              <Link 
                to="/company/about" 
                className={`hover:text-foreground transition ${location.pathname === '/company/about' ? 'text-foreground font-medium' : ''}`}
              >
                About
              </Link>
              <Link 
                to="/company/blog" 
                className={`hover:text-foreground transition ${location.pathname === '/company/blog' ? 'text-foreground font-medium' : ''}`}
              >
                Blog
              </Link>
              <Link 
                to="/company/careers" 
                className={`hover:text-foreground transition ${location.pathname === '/company/careers' ? 'text-foreground font-medium' : ''}`}
              >
                Careers
              </Link>
              <Link 
                to="/company/contact" 
                className={`hover:text-foreground transition ${location.pathname === '/company/contact' ? 'text-foreground font-medium' : ''}`}
              >
                Contact
              </Link>
            </div>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <Link
                to="/product"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/product' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Product
              </Link>
              <Link
                to="/features"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/features' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Features
              </Link>
              <Link
                to="/use-cases"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/use-cases' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Use Cases
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/pricing' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Pricing
              </Link>
              <Link
                to="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/docs' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Documentation
              </Link>
            </div>
            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <Link
                to="/company/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/company/about' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                About
              </Link>
              <Link
                to="/company/blog"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/company/blog' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Blog
              </Link>
              <Link
                to="/company/careers"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/company/careers' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Careers
              </Link>
              <Link
                to="/company/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2 rounded-lg ${location.pathname === '/company/contact' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                Contact
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
};

export default MainLayout;
