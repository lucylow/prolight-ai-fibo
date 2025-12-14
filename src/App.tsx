import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/sign-in" element={<SignIn />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/presets" element={<Presets />} />
                  <Route path="/natural-language" element={<NaturalLanguage />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/pricing" element={<MarketingPricingPage />} />
                  <Route path="/pricing/checkout" element={<Pricing />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/account" 
                    element={
                      <ProtectedRoute>
                        <AccountSettings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/billing" 
                    element={
                      <ProtectedRoute>
                        <Billing />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/invoices" 
                    element={
                      <ProtectedRoute>
                        <Invoices />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/teams" 
                    element={
                      <ProtectedRoute>
                        <Teams />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/admin/refunds" element={<AdminRefunds />} />
                  <Route path="/customer-portal" element={<CustomerPortal />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/cancel" element={<Cancel />} />
                  <Route path="/legal" element={<LegalIndex />} />
                  <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                  <Route path="/legal/terms" element={<TermsOfService />} />
                  <Route path="/legal/cookies" element={<CookiePolicy />} />
                  <Route path="/company/about" element={<AboutPage />} />
                  <Route path="/company/blog" element={<BlogPage />} />
                  <Route path="/company/blog/:slug" element={<PostView />} />
                  <Route path="/company/careers" element={<CareersPage />} />
                  <Route path="/company/contact" element={<ContactPage />} />
                  <Route path="/product" element={<ProductPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/use-cases" element={<UseCasesPage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MainLayout>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
