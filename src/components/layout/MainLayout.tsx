import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Lightbulb, FlaskConical, MessageSquare, Palette, History, Menu, X, Sun, Moon, 
  User, Settings, LogOut, Shield, LayoutDashboard, CreditCard, Users, FileText,
  Sparkles, Building2, BookOpen, DollarSign, Info, Briefcase, Mail, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Navigation structure with grouped items
const navigationGroups = {
  tools: [
    { path: '/studio', label: 'Studio', icon: FlaskConical, auth: false, description: 'Create lighting setups' },
    { path: '/presets', label: 'Presets', icon: Palette, auth: false, description: 'Browse presets' },
    { path: '/natural-language', label: 'AI Chat', icon: MessageSquare, auth: false, description: 'Natural language control' },
    { path: '/history', label: 'History', icon: History, auth: false, description: 'View past projects' },
  ],
  account: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true, description: 'Overview & analytics' },
    { path: '/teams', label: 'Teams', icon: Users, auth: true, description: 'Team management' },
    { path: '/billing', label: 'Billing', icon: CreditCard, auth: true, description: 'Manage subscription' },
    { path: '/invoices', label: 'Invoices', icon: FileText, auth: true, description: 'View invoices' },
    { path: '/admin', label: 'Admin', icon: Shield, auth: true, role: 'admin' as const, description: 'Admin panel' },
  ],
  marketing: [
    { path: '/product', label: 'Product', icon: Sparkles, auth: false, description: 'Product overview' },
    { path: '/features', label: 'Features', icon: Sparkles, auth: false, description: 'Key features' },
    { path: '/use-cases', label: 'Use Cases', icon: Briefcase, auth: false, description: 'Use cases' },
    { path: '/pricing', label: 'Pricing', icon: DollarSign, auth: false, description: 'Pricing plans' },
    { path: '/docs', label: 'Documentation', icon: BookOpen, auth: false, description: 'API & guides' },
  ],
  company: [
    { path: '/company/about', label: 'About', icon: Info, auth: false, description: 'About us' },
    { path: '/company/blog', label: 'Blog', icon: BookOpen, auth: false, description: 'Latest posts' },
    { path: '/company/careers', label: 'Careers', icon: Briefcase, auth: false, description: 'Join our team' },
    { path: '/company/contact', label: 'Contact', icon: Mail, auth: false, description: 'Get in touch' },
  ],
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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

  // Filter navigation items based on auth and role
  const getVisibleItems = (items: typeof navigationGroups.tools) => {
    return items.filter(item => {
      if (item.auth && !auth.user) return false;
      if (item.role && auth.user?.role !== item.role) return false;
      return true;
    });
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Navigation item component for desktop
  const NavItem = ({ item, group }: { item: typeof navigationGroups.tools[0], group?: string }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  // Mobile menu item component
  const MobileNavItem = ({ item }: { item: typeof navigationGroups.tools[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setMobileMenuOpen(false);
          }
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground hover:bg-muted/50"
        )}
        aria-current={active ? 'page' : undefined}
        role="menuitem"
      >
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-medium text-sm">{item.label}</span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-2 -ml-2"
              aria-label="ProLighting Home"
            >
              <Lightbulb className="text-primary w-6 h-6" />
              <span className="hidden sm:inline">ProLighting</span>
              <span className="sm:hidden">ProLight</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {/* Tools Group */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-3 text-sm">
                      Tools
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[400px] p-4">
                        <div className="grid gap-2">
                          {getVisibleItems(navigationGroups.tools).map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <NavigationMenuLink key={item.path} asChild>
                                <a
                                  href={item.path}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(item.path);
                                  }}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                                    active
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  <Icon className="w-5 h-5 shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <span className="text-xs text-muted-foreground">{item.description}</span>
                                  </div>
                                </a>
                              </NavigationMenuLink>
                            );
                          })}
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              {/* Account Group (only if authenticated) */}
              {auth.user && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="h-9 px-3 text-sm">
                        Account
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[400px] p-4">
                          <div className="grid gap-2">
                            {getVisibleItems(navigationGroups.account).map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              return (
                                <NavigationMenuLink key={item.path} asChild>
                                  <Link
                                    to={item.path}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                      active
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">{item.label}</span>
                                      <span className="text-xs text-muted-foreground">{item.description}</span>
                                    </div>
                                  </Link>
                                </NavigationMenuLink>
                              );
                            })}
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}

              {/* Marketing Links */}
              <div className="flex items-center gap-1 ml-2">
                {getVisibleItems(navigationGroups.marketing).slice(0, 3).map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </div>

              {/* More dropdown for additional marketing items */}
              {getVisibleItems(navigationGroups.marketing).length > 3 && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="h-9 px-3 text-sm">
                        More
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[300px] p-4">
                          <div className="grid gap-2">
                            {getVisibleItems(navigationGroups.marketing).slice(3).map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              return (
                                <NavigationMenuLink key={item.path} asChild>
                                  <a
                                    href={item.path}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigate(item.path);
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                                      active
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="font-medium text-sm">{item.label}</span>
                                  </a>
                                </NavigationMenuLink>
                              );
                            })}
                          </div>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hidden md:flex"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Auth Section */}
              {auth.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-9">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={auth.user.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(auth.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-sm">{auth.user.name}</span>
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
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/sign-in')} size="sm" className="hidden sm:flex">
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Navigation
            </SheetTitle>
            <SheetDescription>
              Browse all pages and features
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Tools Section */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Tools
              </h3>
              <div className="space-y-1">
                {getVisibleItems(navigationGroups.tools).map((item) => (
                  <MobileNavItem key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Account Section */}
            {auth.user && (
              <>
                <Separator />
                <div>
                  <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Account
                  </h3>
                  <div className="space-y-1">
                    {getVisibleItems(navigationGroups.account).map((item) => (
                      <MobileNavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Marketing Section */}
            <Separator />
            <div>
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resources
              </h3>
              <div className="space-y-1">
                {getVisibleItems(navigationGroups.marketing).map((item) => (
                  <MobileNavItem key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Company Section */}
            <Separator />
            <div>
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Company
              </h3>
              <div className="space-y-1">
                {getVisibleItems(navigationGroups.company).map((item) => (
                  <MobileNavItem key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Mobile Footer Actions */}
            <Separator />
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
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
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]" role="main">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
