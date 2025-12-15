import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lightbulb, FlaskConical, MessageSquare, Palette, History, Menu, Sparkles, X, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { NavigationCommandPalette } from '@/components/NavigationCommandPalette';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/studio', label: 'Studio', icon: FlaskConical, shortcut: '1' },
  { path: '/agentic-workflow', label: 'Agentic AI', icon: Sparkles, shortcut: '2' },
  { path: '/presets', label: 'Presets', icon: Palette, shortcut: '3' },
  { path: '/natural-language', label: 'AI Chat', icon: MessageSquare, shortcut: '4' },
  { path: '/history', label: 'History', icon: History, shortcut: '5' },
];

// Helper to check if a route is active (supports exact and starts-with matching)
const isRouteActive = (currentPath: string, routePath: string): boolean => {
  if (currentPath === routePath) return true;
  // For nested routes, check if current path starts with route path
  if (routePath !== '/' && currentPath.startsWith(routePath)) return true;
  return false;
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Alt/Cmd + number for quick navigation
      if ((e.altKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (navItems[index]) {
          e.preventDefault();
          navigate(navItems[index].path);
        }
      }

      // Escape to close mobile menu
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, mobileMenuOpen]);

  // Generate breadcrumbs
  const breadcrumbSegments = location.pathname.split('/').filter(Boolean);
  const getBreadcrumbLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      studio: 'Studio',
      presets: 'Presets',
      'natural-language': 'AI Chat',
      history: 'History',
      'agentic-workflow': 'Agentic AI',
    };
    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="min-h-screen">
      <NavigationCommandPalette />
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-[5%] py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity"
            aria-label="Home"
          >
            <Lightbulb className="text-secondary" />
            <span>ProLighting</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(location.pathname, item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      isActive && 'gradient-primary',
                      'transition-all duration-200',
                      'hover:scale-105 active:scale-95'
                    )}
                    size="sm"
                    title={`${item.label} (Alt+${item.shortcut})`}
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
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-4 pb-4 border-t border-border pt-4 space-y-2 overflow-hidden"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isRouteActive(location.pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted hover:translate-x-1'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs opacity-60">Alt+{item.shortcut}</span>
                  </Link>
                );
              })}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbSegments.length > 0 && (
        <div className="fixed top-[73px] w-full z-40 px-[5%] py-3 bg-background/60 backdrop-blur-sm border-b border-border">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1 hover:text-foreground">
                    <Home className="w-3.5 h-3.5" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbSegments.map((segment, idx) => {
                const path = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
                const label = getBreadcrumbLabel(segment);
                const isLast = idx === breadcrumbSegments.length - 1;

                return (
                  <React.Fragment key={path}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={path} className="hover:text-foreground">
                            {label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Main Content with smooth transitions */}
      <main
        className={cn(
          'transition-all duration-300 ease-in-out',
          breadcrumbSegments.length > 0 ? 'pt-[145px]' : 'pt-[89px]'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MainLayout;
