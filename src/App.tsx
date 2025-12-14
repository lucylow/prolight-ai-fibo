import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Studio from "./pages/Studio";
import Presets from "./pages/Presets";
import NaturalLanguage from "./pages/NaturalLanguage";
import History from "./pages/History";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import CustomerPortal from "./pages/CustomerPortal";
import AdminRefunds from "./pages/AdminRefunds";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/company/About";
import BlogPage from "./pages/company/Blog";
import PostView from "./pages/company/PostView";
import CareersPage from "./pages/company/Careers";
import ContactPage from "./pages/company/Contact";
import LegalIndex from "./pages/LegalIndex";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import ProductPage from "./pages/marketing/Product";
import FeaturesPage from "./pages/marketing/Features";
import UseCasesPage from "./pages/marketing/UseCases";
import MarketingPricingPage from "./pages/marketing/Pricing";
import DocsPage from "./pages/marketing/Docs";
import SignIn from "./pages/SignIn";
import SignOut from "./pages/SignOut";
import TextToImage from "./pages/generate/TextToImage";
import TailoredGen from "./pages/generate/TailoredGen";
import AdsGenerator from "./pages/generate/AdsGenerator";
import ProductEditor from "./pages/generate/ProductEditor";
import ImageEditor from "./pages/generate/ImageEditor";
import VideoEditor from "./pages/generate/VideoEditor";
import BriaImageGeneration from "./pages/bria/ImageGeneration";
import BriaTailoredModels from "./pages/bria/TailoredModels";
import BriaAdsGeneration from "./pages/bria/AdsGeneration";
import BriaAdsGenerationV1 from "./pages/bria/AdsGenerationV1";
import BriaProductImagery from "./pages/bria/ProductImagery";
import BriaImageEditing from "./pages/bria/ImageEditing";
import BriaVideoEditing from "./pages/bria/VideoEditing";
import BriaImageOnboarding from "./pages/bria/ImageOnboarding";
import PaymentPage from "./pages/PaymentPage";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import Teams from "./pages/Teams";
import Invoices from "./pages/Invoices";
import Admin from "./pages/Admin";
import { CookieConsent } from "./components/CookieConsent";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -12 }} 
      transition={{ 
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] // Custom easing for smoother feel
      }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
        <Route path="/sign-in" element={<PageWrapper><SignIn /></PageWrapper>} />
        <Route path="/signout" element={<PageWrapper><SignOut /></PageWrapper>} />
        <Route path="/studio" element={<PageWrapper><Studio /></PageWrapper>} />
        <Route path="/presets" element={<PageWrapper><Presets /></PageWrapper>} />
        <Route path="/natural-language" element={<PageWrapper><NaturalLanguage /></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><MarketingPricingPage /></PageWrapper>} />
        <Route path="/pricing/checkout" element={<PageWrapper><Pricing /></PageWrapper>} />
        <Route 
          path="/payment" 
          element={
            <ProtectedRoute>
              <PageWrapper><PaymentPage /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <PageWrapper><Dashboard /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <PageWrapper><AccountSettings /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/billing" 
          element={
            <ProtectedRoute>
              <PageWrapper><Billing /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/invoices" 
          element={
            <ProtectedRoute>
              <PageWrapper><Invoices /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teams" 
          element={
            <ProtectedRoute>
              <PageWrapper><Teams /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute roles={["admin"]}>
              <PageWrapper><Admin /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route path="/admin/refunds" element={<PageWrapper><AdminRefunds /></PageWrapper>} />
        <Route path="/customer-portal" element={<PageWrapper><CustomerPortal /></PageWrapper>} />
        <Route path="/success" element={<PageWrapper><Success /></PageWrapper>} />
        <Route path="/cancel" element={<PageWrapper><Cancel /></PageWrapper>} />
        <Route path="/legal" element={<PageWrapper><LegalIndex /></PageWrapper>} />
        <Route path="/legal/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/legal/terms" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/legal/cookies" element={<PageWrapper><CookiePolicy /></PageWrapper>} />
        <Route path="/company/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
        <Route path="/company/blog" element={<PageWrapper><BlogPage /></PageWrapper>} />
        <Route path="/company/blog/:slug" element={<PageWrapper><PostView /></PageWrapper>} />
        <Route path="/company/careers" element={<PageWrapper><CareersPage /></PageWrapper>} />
        <Route path="/company/contact" element={<PageWrapper><ContactPage /></PageWrapper>} />
        <Route path="/product" element={<PageWrapper><ProductPage /></PageWrapper>} />
        <Route path="/features" element={<PageWrapper><FeaturesPage /></PageWrapper>} />
        <Route path="/use-cases" element={<PageWrapper><UseCasesPage /></PageWrapper>} />
        <Route path="/docs" element={<PageWrapper><DocsPage /></PageWrapper>} />
        <Route path="/generate/text-to-image" element={<PageWrapper><TextToImage /></PageWrapper>} />
        <Route path="/generate/tailored" element={<PageWrapper><TailoredGen /></PageWrapper>} />
        <Route path="/generate/ads" element={<PageWrapper><AdsGenerator /></PageWrapper>} />
        <Route path="/generate/product" element={<PageWrapper><ProductEditor /></PageWrapper>} />
        <Route path="/generate/image-edit" element={<PageWrapper><ImageEditor /></PageWrapper>} />
        <Route path="/generate/video-edit" element={<PageWrapper><VideoEditor /></PageWrapper>} />
        {/* Bria AI Routes */}
        <Route path="/bria/image-generation" element={<PageWrapper><BriaImageGeneration /></PageWrapper>} />
        <Route path="/bria/image-onboarding" element={<PageWrapper><BriaImageOnboarding /></PageWrapper>} />
        <Route path="/bria/tailored-models" element={<PageWrapper><BriaTailoredModels /></PageWrapper>} />
        <Route path="/bria/ads-generation" element={<PageWrapper><BriaAdsGeneration /></PageWrapper>} />
        <Route path="/bria/ads-generation-v1" element={<PageWrapper><BriaAdsGenerationV1 /></PageWrapper>} />
        <Route path="/bria/product-imagery" element={<PageWrapper><BriaProductImagery /></PageWrapper>} />
        <Route path="/bria/image-editing" element={<PageWrapper><BriaImageEditing /></PageWrapper>} />
        <Route path="/bria/video-editing" element={<PageWrapper><BriaVideoEditing /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

// Deployment verification banner - only visible in development or when explicitly enabled
function DeploymentBanner() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(() => {
    // Check if user has dismissed it before
    return localStorage.getItem('deployment-banner-dismissed') === 'true';
  });

  React.useEffect(() => {
    // Only show in development or if explicitly enabled via env var
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const showBanner = import.meta.env.VITE_SHOW_DEPLOY_BANNER === 'true';
    setIsVisible((isDev || showBanner) && !isDismissed);
  }, [isDismissed]);

  if (!isVisible) return null;

  const buildTime = typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__ 
    ? new Date(__BUILD_TIME__).toLocaleString() 
    : 'dev mode';
  const commitHash = typeof __COMMIT_HASH__ !== 'undefined' && __COMMIT_HASH__ 
    ? __COMMIT_HASH__.slice(0, 7)
    : 'local';

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('deployment-banner-dismissed', 'true');
    setIsVisible(false);
  };
  
  return (
    <div 
      className="fixed bottom-0 right-0 z-50 max-w-sm p-3 m-4 rounded-lg shadow-lg border border-border/50 bg-muted/95 backdrop-blur-sm text-xs font-mono transition-all duration-300"
      role="status"
      aria-label="Build information"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-foreground">Build Info</span>
          </div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>Time: <span className="text-foreground">{buildTime}</span></div>
            <div>Commit: <span className="text-foreground font-mono">{commitHash}</span></div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-muted-foreground/20 transition-colors"
          aria-label="Dismiss build information"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ToastContainer position="top-right" autoClose={3000} />
            <BrowserRouter>
              <CookieConsent />
              <DeploymentBanner />
              <MainLayout>
                <AnimatedRoutes />
              </MainLayout>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
