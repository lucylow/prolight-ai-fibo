import React, { useMemo, useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType;
  auth?: boolean;
  role?: string;
  description: string;
};

// Navigation structure with grouped items - organized by user journey
const navigationGroups: {
  create: NavItem[];
  learn: NavItem[];
  company: NavItem[];
  account: NavItem[];
} = {
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
      if ('role' in item && item.role && auth.user?.role !== item.role) return false;
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
    return allNavItems.filter((item: NavItem) => {
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

  // Navigation item component for desktop (memoized for performance)
  const NavItem = React.memo(({ item, group }: { item: typeof navigationGroups.create[0], group?: string }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          active
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:shadow-sm active:scale-[0.98]"
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
          <span className="absolute inset-0 bg-primary/10 rounded-lg -z-0 animate-pulse" aria-hidden="true" />
        )}
      </Link>
    );
  });
  NavItem.displayName = 'NavItem';

  // Mobile menu item component (memoized for performance)
  const MobileNavItem = React.memo(({ item }: { item: typeof navigationGroups.create[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    const handleClick = useCallback(() => {
      setMobileMenuOpen(false);
      setSearchQuery('');
    }, []);
    
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setMobileMenuOpen(false);
        setSearchQuery('');
      }
    }, []);
    
    return (
      <Link
        to={item.path}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          "group relative overflow-hidden",
          active
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border border-primary/30"
            : "text-foreground hover:bg-muted/80 hover:shadow-md active:scale-[0.98] border border-transparent hover:border-border/50"
        )}
        aria-current={active ? 'page' : undefined}
        role="menuitem"
        tabIndex={0}
      >
        <div className={cn(
          "p-2.5 rounded-lg transition-all duration-200 shrink-0",
          active 
            ? "bg-primary-foreground/20 shadow-sm" 
            : "bg-muted/60 group-hover:bg-muted group-hover:scale-110"
        )}>
          <Icon className={cn(
            "w-5 h-5 transition-transform duration-200",
            active ? "scale-110" : "group-hover:scale-110"
          )} aria-hidden="true" />
        </div>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <span className={cn(
            "font-semibold text-sm leading-tight",
            active ? "text-primary-foreground" : "text-foreground"
          )}>{item.label}</span>
          {item.description && (
            <span className={cn(
              "text-xs truncate leading-tight",
              active ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {item.description}
            </span>
          )}
        </div>
        {active && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 rounded-full bg-primary-foreground shrink-0 shadow-sm"
          />
        )}
        {!active && (
          <ChevronDown className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 -rotate-90 shrink-0" />
        )}
      </Link>
    );
  });
  MobileNavItem.displayName = 'MobileNavItem';

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 w-full z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/50 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 sm:gap-2.5 font-bold text-base sm:text-lg hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-1 sm:px-2 -ml-1 sm:-ml-2 group shrink-0 active:scale-95"
              aria-label="ProLighting Home"
            >
              <div className="relative">
                <Lightbulb className="text-primary w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:text-primary/90" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-active:opacity-50" />
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text transition-all duration-200 group-hover:from-foreground group-hover:via-primary/90 group-hover:to-foreground/90">ProLighting</span>
              <span className="sm:hidden bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-sm transition-all duration-200 group-hover:from-foreground group-hover:via-primary/90 group-hover:to-foreground/90">ProLight</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main navigation">
              {/* Create Group - Primary actions */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-9 px-4 text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md data-[state=open]:bg-muted/80 data-[state=open]:text-foreground">
                      Create
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[440px] p-3">
                        <div className="grid gap-1.5">
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
                                    "flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 cursor-pointer group/item relative",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    active
                                      ? "bg-primary/10 text-primary shadow-md shadow-primary/5 border border-primary/20"
                                      : "hover:bg-muted/80 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-transparent"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2.5 rounded-lg transition-all duration-200 shrink-0",
                                    active 
                                      ? "bg-primary/20 text-primary shadow-sm" 
                                      : "bg-muted/60 group-hover/item:bg-muted group-hover/item:scale-105"
                                  )}>
                                    <Icon className={cn(
                                      "w-5 h-5 transition-transform duration-200",
                                      active ? "scale-110" : "group-hover/item:scale-110"
                                    )} />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                    <span className="font-semibold text-sm leading-tight">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate leading-tight">{item.description}</span>
                                  </div>
                                  {active && (
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50"
                                    />
                                  )}
                                  {!active && (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all duration-200 -rotate-90 group-hover/item:translate-x-0.5 shrink-0" />
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
                    <NavigationMenuTrigger className="h-9 px-4 text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md data-[state=open]:bg-muted/80 data-[state=open]:text-foreground">
                      Learn
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[440px] p-3">
                        <div className="grid gap-1.5">
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
                                    "flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 cursor-pointer group/item relative",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    active
                                      ? "bg-primary/10 text-primary shadow-md shadow-primary/5 border border-primary/20"
                                      : "hover:bg-muted/80 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-transparent"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2.5 rounded-lg transition-all duration-200 shrink-0",
                                    active 
                                      ? "bg-primary/20 text-primary shadow-sm" 
                                      : "bg-muted/60 group-hover/item:bg-muted group-hover/item:scale-105"
                                  )}>
                                    <Icon className={cn(
                                      "w-5 h-5 transition-transform duration-200",
                                      active ? "scale-110" : "group-hover/item:scale-110"
                                    )} />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                    <span className="font-semibold text-sm leading-tight">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate leading-tight">{item.description}</span>
                                  </div>
                                  {active && (
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50"
                                    />
                                  )}
                                  {!active && (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all duration-200 -rotate-90 group-hover/item:translate-x-0.5 shrink-0" />
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
                    <NavigationMenuTrigger className="h-9 px-4 text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md data-[state=open]:bg-muted/80 data-[state=open]:text-foreground">
                      Company
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[440px] p-3">
                        <div className="grid gap-1.5">
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
                                    "flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 cursor-pointer group/item relative",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    active
                                      ? "bg-primary/10 text-primary shadow-md shadow-primary/5 border border-primary/20"
                                      : "hover:bg-muted/80 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-transparent"
                                  )}
                                >
                                  <div className={cn(
                                    "p-2.5 rounded-lg transition-all duration-200 shrink-0",
                                    active 
                                      ? "bg-primary/20 text-primary shadow-sm" 
                                      : "bg-muted/60 group-hover/item:bg-muted group-hover/item:scale-105"
                                  )}>
                                    <Icon className={cn(
                                      "w-5 h-5 transition-transform duration-200",
                                      active ? "scale-110" : "group-hover/item:scale-110"
                                    )} />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                    <span className="font-semibold text-sm leading-tight">{item.label}</span>
                                    <span className="text-xs text-muted-foreground truncate leading-tight">{item.description}</span>
                                  </div>
                                  {active && (
                                    <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50"
                                    />
                                  )}
                                  {!active && (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all duration-200 -rotate-90 group-hover/item:translate-x-0.5 shrink-0" />
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
                      <NavigationMenuTrigger className="h-9 px-4 text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md data-[state=open]:bg-muted/80 data-[state=open]:text-foreground">
                        Account
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[440px] p-3">
                          <div className="grid gap-1.5">
                            {getVisibleItems(navigationGroups.account).map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.path);
                              return (
                                <NavigationMenuLink key={item.path} asChild>
                                  <Link
                                    to={item.path}
                                    className={cn(
                                      "flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 group/item relative",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                      active
                                        ? "bg-primary/10 text-primary shadow-md shadow-primary/5 border border-primary/20"
                                        : "hover:bg-muted/80 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-transparent"
                                    )}
                                  >
                                    <div className={cn(
                                      "p-2.5 rounded-lg transition-all duration-200 shrink-0",
                                      active 
                                        ? "bg-primary/20 text-primary shadow-sm" 
                                        : "bg-muted/60 group-hover/item:bg-muted group-hover/item:scale-110"
                                    )}>
                                      <Icon className={cn(
                                        "w-4.5 h-4.5 transition-transform duration-200",
                                        active ? "scale-110" : "group-hover/item:scale-110"
                                      )} />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                      <span className="font-semibold text-sm leading-tight">{item.label}</span>
                                      <span className="text-xs text-muted-foreground truncate leading-tight">{item.description}</span>
                                    </div>
                                    {active && (
                                      <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50"
                                      />
                                    )}
                                    {!active && (
                                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-all duration-200 -rotate-90 group-hover/item:translate-x-0.5 shrink-0" />
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
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2.5 h-9 px-2 sm:px-3 hover:bg-muted/80 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                      aria-label="User menu"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-background ring-offset-2 ring-offset-background transition-all duration-200 group-hover:ring-primary/20">
                        <AvatarImage src={auth.user.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {getInitials(auth.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden xl:inline text-sm font-medium">{auth.user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2">
                    <DropdownMenuLabel className="px-3 py-2.5">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-tight">{auth.user.name}</p>
                        <p className="text-xs leading-tight text-muted-foreground truncate">{auth.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem 
                      onClick={() => navigate('/dashboard')}
                      className="px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 focus:bg-muted/80 focus:text-foreground"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2.5 text-muted-foreground" />
                      <span className="font-medium">Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/account')}
                      className="px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 focus:bg-muted/80 focus:text-foreground"
                    >
                      <Settings className="w-4 h-4 mr-2.5 text-muted-foreground" />
                      <span className="font-medium">Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem 
                      onClick={handleLogoutClick} 
                      className="px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      <LogOut className="w-4 h-4 mr-2.5" />
                      <span className="font-medium">Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/sign-in')} 
                    size="sm" 
                    className="text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/sign-up')} 
                    size="sm" 
                    className="text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Sign Up
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 hover:bg-muted/80 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
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
        <SheetContent side="right" className="w-[90vw] sm:w-[85vw] md:w-[440px] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="px-4 sm:px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-b from-background to-background/95">
            <SheetTitle className="flex items-center gap-3">
              <div className="relative">
                <Lightbulb className="w-6 h-6 text-primary transition-transform duration-300 group-hover:rotate-12" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Navigation</span>
            </SheetTitle>
            <SheetDescription className="text-left text-sm text-muted-foreground mt-1.5">
              Browse all pages and features
            </SheetDescription>
          </SheetHeader>

          {/* Search Bar */}
          <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border/50 bg-background/50 sticky top-0 z-10 backdrop-blur-sm">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground transition-all duration-200 group-focus-within:text-primary group-focus-within:scale-110" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-24 h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
                aria-label="Search navigation"
                aria-describedby="search-hint"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted transition-all duration-200 active:scale-95"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
                <kbd className="px-2 py-1 bg-muted/70 rounded-md border border-border/50 font-mono text-[10px] shadow-sm">⌘</kbd>
                <kbd className="px-2 py-1 bg-muted/70 rounded-md border border-border/50 font-mono text-[10px] shadow-sm">K</kbd>
              </div>
              <p id="search-hint" className="sr-only">Use keyboard shortcut Cmd+K or Ctrl+K to search</p>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            {/* Search Results */}
            <AnimatePresence>
              {searchQuery.trim() && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="mb-6 space-y-2"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Search Results
                    </h3>
                    {filteredSearchResults.length > 0 && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        {filteredSearchResults.length} {filteredSearchResults.length === 1 ? 'result' : 'results'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {filteredSearchResults.length > 0 ? (
                      filteredSearchResults.map((item, index) => (
                        <motion.div
                          key={item.path}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                        >
                          <MobileNavItem item={item} />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 py-12 text-center"
                      >
                        <div className="relative inline-block mb-4">
                          <Search className="w-12 h-12 mx-auto text-muted-foreground/40" />
                          <div className="absolute inset-0 bg-muted-foreground/5 rounded-full blur-xl" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          No results found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try searching for <span className="font-medium">"{searchQuery}"</span> with different terms
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Regular Navigation (hidden when searching) */}
            {!searchQuery.trim() && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Create Section - Primary actions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                      Create
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <div className="space-y-1.5">
                    {getVisibleItems(navigationGroups.create).map((item) => (
                      <MobileNavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>

                {/* Learn Section - Product information */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                      Learn
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <div className="space-y-1.5">
                    {getVisibleItems(navigationGroups.learn).map((item) => (
                      <MobileNavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>

                {/* Company Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                      Company
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  <div className="space-y-1.5">
                    {getVisibleItems(navigationGroups.company).map((item) => (
                      <MobileNavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>

                {/* Account Section */}
                {auth.user && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                        Account
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                    <div className="space-y-1.5">
                      {getVisibleItems(navigationGroups.account).map((item) => (
                        <MobileNavItem key={item.path} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Mobile Footer Actions - Sticky */}
          {!searchQuery.trim() && (
            <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4 mt-auto">
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  className="rounded-lg hover:bg-muted/80 transition-all duration-200 active:scale-95"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                {auth.user ? (
                  <Button 
                    variant="ghost" 
                    onClick={handleLogoutClick} 
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 active:scale-95"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => { 
                        navigate('/sign-in'); 
                        setMobileMenuOpen(false); 
                      }} 
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg transition-all duration-200 active:scale-95"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => { 
                        navigate('/sign-up'); 
                        setMobileMenuOpen(false); 
                      }} 
                      size="sm"
                      className="flex-1 rounded-lg transition-all duration-200 active:scale-95"
                    >
                      Sign Up
                    </Button>
                  </>
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
