import React, { useMemo, useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Lightbulb, FlaskConical, MessageSquare, Palette, History, Menu, X, Sun, Moon, 
  User, Settings, LogOut, Shield, LayoutDashboard, CreditCard, Users, FileText,
  Sparkles, Building2, BookOpen, DollarSign, Info, Briefcase, Mail, ChevronDown,
  Search, Command, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Navigation structure with grouped items - organized by user journey
const navigationGroups = {
  // Primary actions - tools for creating and managing lighting
  create: [
    { path: '/studio', label: 'Studio', icon: FlaskConical, auth: false, description: 'Create lighting setups' },
    { path: '/presets', label: 'Presets', icon: Palette, auth: false, description: 'Browse presets' },
    { path: '/natural-language', label: 'AI Chat', icon: MessageSquare, auth: false, description: 'Natural language control' },
    { path: '/history', label: 'History', icon: History, auth: false, description: 'View past projects' },
  ],
  // Learning and product information
  learn: [
    { path: '/product', label: 'Product', icon: Sparkles, auth: false, description: 'Product overview' },
    { path: '/features', label: 'Features', icon: Sparkles, auth: false, description: 'Key features' },
    { path: '/use-cases', label: 'Use Cases', icon: Briefcase, auth: false, description: 'Use cases' },
    { path: '/pricing', label: 'Pricing', icon: DollarSign, auth: false, description: 'Pricing plans' },
    { path: '/docs', label: 'Documentation', icon: BookOpen, auth: false, description: 'API & guides' },
  ],
  // Company information
  company: [
    { path: '/company/about', label: 'About', icon: Info, auth: false, description: 'About us' },
    { path: '/company/blog', label: 'Blog', icon: BookOpen, auth: false, description: 'Latest posts' },
    { path: '/company/careers', label: 'Careers', icon: Briefcase, auth: false, description: 'Join our team' },
    { path: '/company/contact', label: 'Contact', icon: Mail, auth: false, description: 'Get in touch' },
  ],
  // User account and management (only when authenticated)
  account: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true, description: 'Overview & analytics' },
    { path: '/teams', label: 'Teams', icon: Users, auth: true, description: 'Team management' },
    { path: '/billing', label: 'Billing', icon: CreditCard, auth: true, description: 'Manage subscription' },
    { path: '/invoices', label: 'Invoices', icon: FileText, auth: true, description: 'View invoices' },
    { path: '/admin', label: 'Admin', icon: Shield, auth: true, role: 'admin' as const, description: 'Admin panel' },
  ],
};

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close mobile menu on route change and clear search
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Handle escape key to close mobile menu
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (mobileMenuOpen) {
          searchInputRef.current?.focus();
        } else {
          setMobileMenuOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
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

  const handleLogoutClick = useCallback(() => {
    setShowSignOutDialog(true);
  }, []);

  const handleLogout = useCallback(async () => {
    setSigningOut(true);
    try {
      await auth.logout();
      toast.success('Signed out successfully');
      setShowSignOutDialog(false);
      navigate('/sign-in', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  }, [auth, navigate]);

  // Filter navigation items based on auth and role (memoized)
  const getVisibleItems = useCallback(<T extends typeof navigationGroups.create[0]>(items: T[]): T[] => {
    return items.filter(item => {
      if (item.auth && !auth.user) return false;
      if (item.role && auth.user?.role !== item.role) return false;
      return true;
    });
  }, [auth.user]);

  // Search functionality (memoized)
  const allNavItems = useMemo(() => [
    ...navigationGroups.create,
    ...navigationGroups.learn,
    ...navigationGroups.company,
    ...navigationGroups.account,
  ], []);

  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allNavItems.filter(item => {
      if (item.auth && !auth.user) return false;
      if (item.role && auth.user?.role !== item.role) return false;
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, auth.user, allNavItems]);

  const isActive = useCallback((path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Navigation item component for desktop
  const NavItem = ({ item, group }: { item: typeof navigationGroups.create[0], group?: string }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
          active
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:shadow-sm"
        )}
        aria-current={active ? 'page' : undefined}
        aria-label={`Navigate to ${item.label}`}
      >
        <Icon className={cn(
          "w-4 h-4 shrink-0 transition-all duration-200",
          active ? "scale-110 text-primary-foreground" : "group-hover:scale-110 group-hover:text-foreground"
        )} aria-hidden="true" />
        <span className="relative z-10">{item.label}</span>
        {active && (
          <span className="absolute inset-0 bg-primary/10 rounded-lg -z-0" aria-hidden="true" />
        )}
      </Link>
    );
  };

  // Mobile menu item component
  const MobileNavItem = ({ item }: { item: typeof navigationGroups.create[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        to={item.path}
        onClick={() => {
          setMobileMenuOpen(false);
          setSearchQuery('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setMobileMenuOpen(false);
            setSearchQuery('');
          }
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group",
          active
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-foreground hover:bg-muted/70 hover:shadow-sm active:scale-[0.98]"
        )}
        aria-current={active ? 'page' : undefined}
        role="menuitem"
      >
        <div className={cn(
          "p-2 rounded-lg transition-all duration-200",
          active ? "bg-primary-foreground/20" : "bg-muted/50 group-hover:bg-muted"
        )}>
          <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium text-sm">{item.label}</span>
          {item.description && (
            <span className={cn(
              "text-xs mt-0.5 truncate",
              active ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {item.description}
            </span>
          )}
        </div>
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground shrink-0" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 w-full z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/50 shadow-sm transition-all duration-200">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 sm:gap-2.5 font-bold text-base sm:text-lg hover:opacity-80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-1 sm:px-2 -ml-1 sm:-ml-2 group shrink-0"
              aria-label="ProLighting Home"
            >
              <div className="relative">
                <Lightbulb className="text-primary w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">ProLighting</span>
              <span className="sm:hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-sm">ProLight</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {/* Create Group - Primary actions */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-3 text-sm font-medium hover:bg-muted/70 transition-all duration-200">
                      Create
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[420px] p-2">
                        <div className="grid gap-1">
                          {getVisibleItems(navigationGroups.create).map((item) => {
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
                                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group/item",
                                    active
                                      ? "bg-primary/10 text-primary shadow-sm"
                                      : "hover:bg-muted/70 hover:shadow-sm"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2 rounded-md transition-all duration-200",
                                    active ? "bg-primary/20" : "bg-muted/50 group-hover/item:bg-muted"
                                  )}>
                                    <Icon className="w-4 h-4 shrink-0" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                  </div>
                                  {active && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  )}
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

              {/* Learn Group - Product information and resources */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-3 text-sm font-medium hover:bg-muted/70 transition-all duration-200">
                      Learn
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[420px] p-2">
                        <div className="grid gap-1">
                          {getVisibleItems(navigationGroups.learn).map((item) => {
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
                                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group/item",
                                    active
                                      ? "bg-primary/10 text-primary shadow-sm"
                                      : "hover:bg-muted/70 hover:shadow-sm"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2 rounded-md transition-all duration-200",
                                    active ? "bg-primary/20" : "bg-muted/50 group-hover/item:bg-muted"
                                  )}>
                                    <Icon className="w-4 h-4 shrink-0" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                  </div>
                                  {active && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  )}
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

              {/* Company Group */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-3 text-sm font-medium hover:bg-muted/70 transition-all duration-200">
                      Company
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[420px] p-2">
                        <div className="grid gap-1">
                          {getVisibleItems(navigationGroups.company).map((item) => {
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
                                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group/item",
                                    active
                                      ? "bg-primary/10 text-primary shadow-sm"
                                      : "hover:bg-muted/70 hover:shadow-sm"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2 rounded-md transition-all duration-200",
                                    active ? "bg-primary/20" : "bg-muted/50 group-hover/item:bg-muted"
                                  )}>
                                    <Icon className="w-4 h-4 shrink-0" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                  </div>
                                  {active && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  )}
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
                      <NavigationMenuTrigger className="h-9 px-3 text-sm font-medium hover:bg-muted/70 transition-all duration-200">
                        Account
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[420px] p-2">
                          <div className="grid gap-1">
                            {getVisibleItems(navigationGroups.account).map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              return (
                                <NavigationMenuLink key={item.path} asChild>
                                  <Link
                                    to={item.path}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group/item",
                                      active
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "hover:bg-muted/70 hover:shadow-sm"
                                    )}
                                  >
                                    <div className={cn(
                                      "p-2 rounded-md transition-all duration-200",
                                      active ? "bg-primary/20" : "bg-muted/50 group-hover/item:bg-muted"
                                    )}>
                                      <Icon className="w-4 h-4 shrink-0" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="font-medium text-sm">{item.label}</span>
                                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                    </div>
                                    {active && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    )}
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
                      <Settings className="w-4 h-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => navigate('/sign-in')} size="sm" className="hidden sm:flex text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4">
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9"
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
      <Sheet open={mobileMenuOpen} onOpenChange={(open) => {
        setMobileMenuOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <SheetContent side="right" className="w-[90vw] sm:w-[85vw] md:w-[420px] overflow-y-auto p-4 sm:p-6">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2.5">
              <div className="relative">
                <Lightbulb className="w-5 h-5 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
              </div>
              <span>Navigation</span>
            </SheetTitle>
            <SheetDescription className="text-left">
              Browse all pages and features
            </SheetDescription>
          </SheetHeader>

          {/* Search Bar */}
          <div className="mt-6 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">K</kbd>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="mb-6 space-y-2">
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Search Results
              </h3>
              <div className="space-y-1">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((item) => (
                    <MobileNavItem key={item.path} item={item} />
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regular Navigation (hidden when searching) */}
          {!searchQuery.trim() && (
            <div className="mt-6 space-y-6">
            {/* Create Section - Primary actions */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Create
              </h3>
              <div className="space-y-1">
                {getVisibleItems(navigationGroups.create).map((item) => (
                  <MobileNavItem key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Learn Section - Product information */}
            <Separator />
            <div>
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Learn
              </h3>
              <div className="space-y-1">
                {getVisibleItems(navigationGroups.learn).map((item) => (
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

            {/* Mobile Footer Actions */}
            <Separator />
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="rounded-lg"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              {auth.user ? (
                <Button 
                  variant="ghost" 
                  onClick={handleLogoutClick} 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button 
                  onClick={() => { 
                    navigate('/sign-in'); 
                    setMobileMenuOpen(false); 
                  }} 
                  size="sm"
                  className="rounded-lg"
                >
                  Sign In
                </Button>
              )}
            </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main 
        className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] w-full overflow-x-hidden" 
        role="main"
        id="main-content"
        aria-label="Main content"
      >
        {children}
      </main>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={signingOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {signingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MainLayout;
