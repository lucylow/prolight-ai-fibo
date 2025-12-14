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
      <header className="fixed top-0 w-full z-50 px-[5%] py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 font-bold text-xl">
            <Lightbulb className="text-secondary" />
            <span>ProLighting</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => {
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
            <div className="ml-6 flex gap-4 text-sm text-muted-foreground">
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
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                  className={`flex items-center gap-2 p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
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
      <main className="pt-20">{children}</main>
    </div>
  );
};

export default MainLayout;
