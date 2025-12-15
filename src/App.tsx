import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/IndexImproved";
import Studio from "./pages/Studio";
import Presets from "./pages/Presets";
import NaturalLanguage from "./pages/NaturalLanguage";
import History from "./pages/History";
import AgenticWorkflow from "./pages/AgenticWorkflow";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Checkout from "./pages/Checkout";
import Transactions from "./pages/Transactions";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import LegalIndex from "./pages/LegalIndex";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import DocsPage from "./pages/marketing/Docs";
import ProductPage from "./pages/marketing/Product";
import FeaturesPage from "./pages/marketing/Features";
import UseCasesPage from "./pages/marketing/UseCases";
import AboutPage from "./pages/company/About";
import BlogPage from "./pages/company/Blog";
import PostView from "./pages/company/PostView";
import CareersPage from "./pages/company/Careers";
import ContactPage from "./pages/company/Contact";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountSettings from "./pages/AccountSettings";
import Dashboard from "./pages/Dashboard";
import { errorService, getUserErrorMessage } from "@/services/errorService";
import { toast } from "sonner";

// Configure QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors or client errors (4xx)
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            return false;
          }
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      onError: (error) => {
        errorService.logError(error, {
          component: 'ReactQuery',
          action: 'mutation_error',
        }).catch((err) => {
          console.error('Failed to log mutation error:', err);
        });
        
        // Show user-friendly error message
        const message = getUserErrorMessage(error);
        toast.error(message);
      },
      retry: (failureCount, error) => {
        // Don't retry mutations on auth errors or client errors (4xx)
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            return false;
          }
        }
        // Retry once for server errors
        return failureCount < 1;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <MainLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/presets" element={<Presets />} />
            <Route path="/natural-language" element={<NaturalLanguage />} />
            <Route path="/history" element={<History />} />
            <Route path="/agentic-workflow" element={<AgenticWorkflow />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/use-cases" element={<UseCasesPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/company/about" element={<AboutPage />} />
            <Route path="/company/blog" element={<BlogPage />} />
            <Route path="/company/blog/:slug" element={<PostView />} />
            <Route path="/company/careers" element={<CareersPage />} />
            <Route path="/company/contact" element={<ContactPage />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />
            <Route path="/legal" element={<LegalIndex />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/legal/cookies" element={<CookiePolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
