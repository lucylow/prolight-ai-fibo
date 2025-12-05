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
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
};

export default MainLayout;
