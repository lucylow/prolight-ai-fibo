import React, { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";
import MainLayout from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import StripeProvider from "@/contexts/StripeProvider";
import { DeploymentBanner } from "@/components/DeploymentBanner";
import DeployCheckBanner from "@/components/DeployCheckBanner";
import { CookieConsent } from "./components/CookieConsent";
import { ScrollToTop } from "./components/ScrollToTop";
import { initializeMockData } from "./services/enhancedMockData";

// Core pages - loaded immediately
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignOut from "./pages/SignOut";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import Studio from "./pages/Studio";
import Presets from "./pages/Presets";
import NaturalLanguage from "./pages/NaturalLanguage";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";

// Lazy-loaded pages for better performance
const Pricing = lazy(() => import("./pages/Pricing"));
const Billing = lazy(() => import("./pages/Billing"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const AdminRefunds = lazy(() => import("./pages/AdminRefunds"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));
const AboutPage = lazy(() => import("./pages/company/About"));
const BlogPage = lazy(() => import("./pages/company/Blog"));
const PostView = lazy(() => import("./pages/company/PostView"));
const CareersPage = lazy(() => import("./pages/company/Careers"));
const ContactPage = lazy(() => import("./pages/company/Contact"));
const LegalIndex = lazy(() => import("./pages/LegalIndex"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const ProductPage = lazy(() => import("./pages/marketing/Product"));
const FeaturesPage = lazy(() => import("./pages/marketing/Features"));
const UseCasesPage = lazy(() => import("./pages/marketing/UseCases"));
const MarketingPricingPage = lazy(() => import("./pages/marketing/Pricing"));
const DocsPage = lazy(() => import("./pages/marketing/Docs"));
const TextToImage = lazy(() => import("./pages/generate/TextToImage"));
const TailoredGen = lazy(() => import("./pages/generate/TailoredGen"));
const AdsGenerator = lazy(() => import("./pages/generate/AdsGenerator"));
const ProductEditor = lazy(() => import("./pages/generate/ProductEditor"));
const ImageEditor = lazy(() => import("./pages/generate/ImageEditor"));
const VideoEditor = lazy(() => import("./pages/generate/VideoEditor"));
const BriaImageGeneration = lazy(() => import("./pages/bria/ImageGeneration"));
const BriaImageGenerationV2 = lazy(() => import("./pages/bria/ImageGenerationV2"));
const BriaTailoredModels = lazy(() => import("./pages/bria/TailoredModels"));
const BriaAdsGeneration = lazy(() => import("./pages/bria/AdsGeneration"));
const BriaAdsGenerationV1 = lazy(() => import("./pages/bria/AdsGenerationV1"));
const BriaProductImagery = lazy(() => import("./pages/bria/ProductImagery"));
const BriaImageEditing = lazy(() => import("./pages/bria/ImageEditing"));
const BriaVideoEditing = lazy(() => import("./pages/bria/VideoEditing"));
const BriaImageOnboarding = lazy(() => import("./pages/bria/ImageOnboarding"));
const BriaVehicleShotEditor = lazy(() => import("./pages/bria/VehicleShotEditor"));
const BriaV1Generator = lazy(() => import("./pages/bria/V1Generator"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const Teams = lazy(() => import("./pages/Teams"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Admin = lazy(() => import("./pages/Admin"));
const BusinessModelCanvas = lazy(() => import("./pages/BusinessModelCanvas"));
const FreeApisDemo = lazy(() => import("./components/FreeApisDemo"));
const AgenticWorkflow = lazy(() => import("./pages/AgenticWorkflow"));
const AgentOrchestratorPage = lazy(() => import("./pages/AgentOrchestratorPage"));
const WorkflowBuilderPage = lazy(() => import("./pages/WorkflowBuilderPage"));
const WorkflowDetailPage = lazy(() => import("./pages/WorkflowDetailPage"));
const WorkflowLibraryPage = lazy(() => import("./pages/WorkflowLibraryPage"));

// Enhanced loading fallback component with better UX
const PageLoader: React.FC = React.memo(() => (
  <div 
    className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-in bg-background"
    role="status"
    aria-label="Loading page"
  >
    <div className="relative">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary/20"></div>
      <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-primary absolute top-0 left-0"></div>
      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
      </div>
    </div>
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-foreground animate-pulse">Loading page...</p>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
    <span className="sr-only">Loading page content</span>
  </div>
));
PageLoader.displayName = 'PageLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

// Memoized PageWrapper for better performance with optimized animations
const PageWrapper = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<PageLoader />}>
      <motion.div 
        initial={{ opacity: 0, y: 8, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: -8, scale: 0.98 }} 
        transition={{ 
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1], // Custom easing for smoother feel
          layout: { duration: 0.2 }
        }}
        className="w-full min-h-[calc(100vh-4rem)]"
        role="main"
        aria-live="polite"
      >
        {children}
      </motion.div>
    </Suspense>
  );
}, (prevProps, nextProps) => {
  // Only re-render if children actually change
  return prevProps.children === nextProps.children;
});

PageWrapper.displayName = 'PageWrapper';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
        <Route path="/sign-in" element={<PageWrapper><SignIn /></PageWrapper>} />
        <Route path="/signout" element={<PageWrapper><SignOut /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/studio" element={<PageWrapper><Studio /></PageWrapper>} />
        <Route path="/presets" element={<PageWrapper><Presets /></PageWrapper>} />
        <Route path="/natural-language" element={<PageWrapper><NaturalLanguage /></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
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
        <Route 
          path="/admin/refunds" 
          element={
            <ProtectedRoute roles={["admin"]}>
              <PageWrapper><AdminRefunds /></PageWrapper>
            </ProtectedRoute>
          } 
        />
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
        <Route path="/business-model" element={<PageWrapper><BusinessModelCanvas /></PageWrapper>} />
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
        <Route path="/bria/image-generation-v2" element={<PageWrapper><BriaImageGenerationV2 /></PageWrapper>} />
        <Route path="/bria/image-onboarding" element={<PageWrapper><BriaImageOnboarding /></PageWrapper>} />
        <Route path="/bria/tailored-models" element={<PageWrapper><BriaTailoredModels /></PageWrapper>} />
        <Route path="/bria/ads-generation" element={<PageWrapper><BriaAdsGeneration /></PageWrapper>} />
        <Route path="/bria/ads-generation-v1" element={<PageWrapper><BriaAdsGenerationV1 /></PageWrapper>} />
        <Route path="/bria/product-imagery" element={<PageWrapper><BriaProductImagery /></PageWrapper>} />
        <Route path="/bria/vehicle-shot" element={<PageWrapper><BriaVehicleShotEditor /></PageWrapper>} />
        <Route path="/bria/image-editing" element={<PageWrapper><BriaImageEditing /></PageWrapper>} />
        <Route path="/bria/video-editing" element={<PageWrapper><BriaVideoEditing /></PageWrapper>} />
        <Route path="/bria/v1-generator" element={<PageWrapper><BriaV1Generator /></PageWrapper>} />
        <Route path="/demo/free-apis" element={<PageWrapper><FreeApisDemo /></PageWrapper>} />
        <Route path="/agentic-workflows" element={<PageWrapper><AgenticWorkflow /></PageWrapper>} />
        {/* Agentic Workflow Routes */}
        <Route 
          path="/agentic" 
          element={
            <ProtectedRoute>
              <PageWrapper><AgentOrchestratorPage /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agentic/new" 
          element={
            <ProtectedRoute roles={["admin", "editor"]}>
              <PageWrapper><WorkflowBuilderPage /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agentic/library" 
          element={
            <ProtectedRoute>
              <PageWrapper><WorkflowLibraryPage /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agentic/:workflowId" 
          element={
            <ProtectedRoute>
              <PageWrapper><WorkflowDetailPage /></PageWrapper>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}


const App = () => {
  // Initialize mock data on app startup if enabled
  React.useEffect(() => {
    initializeMockData();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <StripeProvider>
              <TooltipProvider>
                <Sonner />
                <BrowserRouter>
                  <ScrollToTop />
                  <CookieConsent />
                  <DeploymentBanner />
                  <DeployCheckBanner />
                  <MainLayout>
                    <AnimatedRoutes />
                  </MainLayout>
                </BrowserRouter>
              </TooltipProvider>
            </StripeProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
