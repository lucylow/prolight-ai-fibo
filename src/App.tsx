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
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -8 }} 
      transition={{ duration: 0.22 }}
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
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

// Deployment verification banner - visible on all pages
function DeploymentBanner() {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__ 
    ? new Date(__BUILD_TIME__).toISOString() 
    : 'dev mode';
  const commitHash = typeof __COMMIT_HASH__ !== 'undefined' && __COMMIT_HASH__ 
    ? __COMMIT_HASH__ 
    : 'local';
  
  return (
    <div 
      style={{ 
        position: "fixed",
        bottom: 0,
        right: 0,
        background: "red",
        color: "white",
        zIndex: 9999,
        padding: "8px 12px",
        fontSize: "12px",
        fontFamily: "monospace",
        borderRadius: "4px 0 0 0",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.3)",
        maxWidth: "400px",
        lineHeight: "1.4"
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        🔴 DEPLOY CHECK
      </div>
      <div>Time: {buildTime}</div>
      <div>Commit: {commitHash}</div>
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
