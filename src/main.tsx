import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import { errorService } from "@/services/errorService";
import "./index.css";

// Global error handlers for unhandled errors and promise rejections
const setupGlobalErrorHandlers = (): void => {
  // Handle unhandled errors
  window.addEventListener('error', (event: ErrorEvent) => {
    errorService.logError(event.error || event.message, {
      component: 'GlobalErrorHandler',
      action: 'unhandled_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    }).catch((err: unknown) => {
      console.error('Failed to log unhandled error:', err);
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    errorService.logError(event.reason, {
      component: 'GlobalErrorHandler',
      action: 'unhandled_promise_rejection',
      metadata: {
        type: 'PromiseRejection',
      },
    }).catch((err: unknown) => {
      console.error('Failed to log unhandled promise rejection:', err);
    });
  });
};

// Setup global error handlers
setupGlobalErrorHandlers();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
