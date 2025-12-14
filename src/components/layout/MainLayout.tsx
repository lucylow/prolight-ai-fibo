import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lightbulb, FlaskConical, MessageSquare, Palette, History, Menu, Sun, Moon, User, Settings, LogOut, Shield, LayoutDashboard, CreditCard, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/studio', label: 'Studio', icon: FlaskConical, auth: false },
  { path: '/presets', label: 'Presets', icon: Palette, auth: false },
  { path: '/natural-language', label: 'AI Chat', icon: MessageSquare, auth: false },
  { path: '/history', label: 'History', icon: History, auth: false },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  { path: '/teams', label: 'Teams', icon: Users, auth: true },
  { path: '/billing', label: 'Billing', icon: CreditCard, auth: true },
  { path: '/invoices', label: 'Invoices', icon: FileText, auth: true },
  { path: '/admin', label: 'Admin', icon: Shield, auth: true, role: 'admin' as const },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const mobileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile menu
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0].toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const visibleNavItems = navItems.filter(item => {
    if (item.auth && !auth.user) return false;
    if (item.role && auth.user?.role !== item.role) return false;
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-4 sm:px-[5%] py-3 sm:py-4 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-3 font-bold text-lg sm:text-xl hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg px-2 -ml-2"
            aria-label="ProLighting Home"
          >
            <Lightbulb className="text-secondary w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">ProLighting</span>
            <span className="sm:hidden">ProLight</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={`${isActive ? 'gradient-primary shadow-md' : 'hover:bg-muted/50'} transition-all duration-200`}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-2" aria-hidden="true" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="ml-6 hidden lg:flex gap-3 xl:gap-4 text-sm text-muted-foreground">
              <Link 
                to="/product" 
                className={`hover:text-foreground transition-colors px-2 py-1 rounded-md ${location.pathname === '/product' ? 'text-foreground font-medium bg-muted/30' : 'hover:bg-muted/20'}`}
                aria-current={location.pathname === '/product' ? 'page' : undefined}
              >
                Product
              </Link>
              <Link 
                to="/features" 
                className={`hover:text-foreground transition-colors px-2 py-1 rounded-md ${location.pathname === '/features' ? 'text-foreground font-medium bg-muted/30' : 'hover:bg-muted/20'}`}
                aria-current={location.pathname === '/features' ? 'page' : undefined}
              >
                Features
              </Link>
              <Link 
                to="/use-cases" 
                className={`hover:text-foreground transition-colors px-2 py-1 rounded-md ${location.pathname === '/use-cases' ? 'text-foreground font-medium bg-muted/30' : 'hover:bg-muted/20'}`}
                aria-current={location.pathname === '/use-cases' ? 'page' : undefined}
              >
                Use Cases
              </Link>
              <Link 
                to="/pricing" 
                className={`hover:text-foreground transition-colors px-2 py-1 rounded-md ${location.pathname === '/pricing' ? 'text-foreground font-medium bg-muted/30' : 'hover:bg-muted/20'}`}
                aria-current={location.pathname === '/pricing' ? 'page' : undefined}
              >
                Pricing
              </Link>
              <Link 
                to="/docs" 
                className={`hover:text-foreground transition-colors px-2 py-1 rounded-md ${location.pathname === '/docs' ? 'text-foreground font-medium bg-muted/30' : 'hover:bg-muted/20'}`}
                aria-current={location.pathname === '/docs' ? 'page' : undefined}
              >
                Docs
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden md:flex"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Auth Section */}
            {auth.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={auth.user.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(auth.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{auth.user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{auth.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{auth.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <User className="w-4 h-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/sign-in')} size="sm">
                Sign In
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-muted/50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'hover:bg-muted/50 active:bg-muted'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-muted/50 transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              {auth.user ? (
                <Button variant="ghost" onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button onClick={() => { navigate('/sign-in'); setMobileMenuOpen(false); }} size="sm">
                  Sign In
                </Button>
              )}
            </div>
            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <Link
                to="/product"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/product' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/product' ? 'page' : undefined}
              >
                <span className="font-medium">Product</span>
              </Link>
              <Link
                to="/features"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/features' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/features' ? 'page' : undefined}
              >
                <span className="font-medium">Features</span>
              </Link>
              <Link
                to="/use-cases"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/use-cases' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/use-cases' ? 'page' : undefined}
              >
                <span className="font-medium">Use Cases</span>
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/pricing' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/pricing' ? 'page' : undefined}
              >
                <span className="font-medium">Pricing</span>
              </Link>
              <Link
                to="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/docs' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/docs' ? 'page' : undefined}
              >
                <span className="font-medium">Documentation</span>
              </Link>
            </div>
            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <Link
                to="/company/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/company/about' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/company/about' ? 'page' : undefined}
              >
                <span className="font-medium">About</span>
              </Link>
              <Link
                to="/company/blog"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/company/blog' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/company/blog' ? 'page' : undefined}
              >
                <span className="font-medium">Blog</span>
              </Link>
              <Link
                to="/company/careers"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/company/careers' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/company/careers' ? 'page' : undefined}
              >
                <span className="font-medium">Careers</span>
              </Link>
              <Link
                to="/company/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                  location.pathname === '/company/contact' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted/50 active:bg-muted'
                }`}
                aria-current={location.pathname === '/company/contact' ? 'page' : undefined}
              >
                <span className="font-medium">Contact</span>
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 sm:pt-20 min-h-screen" role="main">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
