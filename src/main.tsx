import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { errorService, type ErrorContext, extractErrorInfo } from "@/services/errorService";
import { InitializationError } from "@/components/InitializationError";

/**
 * Extract error information from unknown error type
 * Uses the centralized error service utility for consistency
 */
const extractError = (error: unknown): Error => {
  const errorInfo = extractErrorInfo(error);
  const errorObj = new Error(errorInfo.message);
  if (errorInfo.stack) {
    errorObj.stack = errorInfo.stack;
  }
  return errorObj;
};

/**
 * Safe reload function that handles potential errors
 */
const safeReload = (): void => {
  try {
    window.location.reload();
  } catch (reloadError) {
    console.error("Failed to reload page:", reloadError);
    // Fallback: try using location.replace as last resort
    try {
      window.location.replace(window.location.href);
    } catch {
      // If all else fails, at least log it
      console.error("All reload methods failed");
    }
  }
};

/**
 * Enhanced error handler with recovery mechanisms
 */
const handleInitializationError = (error: unknown, rootElement: HTMLElement): void => {
  console.error("Failed to initialize React application:", error);

  const errorObj = extractError(error);
  
  // Log error with context (fire and forget)
  const context: ErrorContext = {
    component: 'main.tsx',
    action: 'initializeApp',
    metadata: {
      initialization: true,
      rootElement: rootElement.id || 'root',
      timestamp: new Date().toISOString(),
    },
  };
  
  errorService.logError(error, context).catch((logError) => {
    console.error("Failed to log initialization error:", logError);
  });

  // Clear root element and render error UI with React
  try {
    rootElement.innerHTML = "";
    const root = createRoot(rootElement);
    
    const handleRetry = (): void => {
      safeReload();
    };

    const handleReload = (): void => {
      safeReload();
    };

    const handleClearStorage = (): void => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (clearError) {
        console.error("Failed to clear storage:", clearError);
        // Continue with reload even if clearing fails
      }
      safeReload();
    };

    root.render(
      <InitializationError
        error={errorObj}
        onRetry={handleRetry}
        onReload={handleReload}
        onClearStorage={handleClearStorage}
      />
    );
  } catch (renderError) {
    // If we can't even render the error UI, show a basic fallback
    console.error("Failed to render error UI:", renderError);
    rootElement.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please refresh the page.</p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
          Reload Page
        </button>
      </div>
    `;
  }
};

/**
 * Initialize React application with error handling
 */
const initializeApp = (rootElement: HTMLElement): void => {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
        </NextThemeProvider>
      </React.StrictMode>
    );
  } catch (error) {
    handleInitializationError(error, rootElement);
    // Re-throw to ensure error is tracked, but don't let it crash the script
    if (import.meta.env.DEV) {
      throw error;
    }
  }
};

/**
 * Get or create root element for React
 */
const getRootElement = (): HTMLElement => {
  let rootElement = document.getElementById("root");

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);
  }

  return rootElement;
};

/**
 * Setup global error handlers for unhandled errors
 */
const setupGlobalErrorHandlers = (): void => {
  // Handle synchronous errors
  window.addEventListener("error", (event) => {
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'globalErrorHandler',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString(),
      },
    };

    errorService.logError(event.error || event.message, context).catch((logError) => {
      console.error("Failed to log global error:", logError);
    });

    // Don't prevent default - let ErrorBoundary handle it in React components
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'unhandledRejection',
      metadata: {
        timestamp: new Date().toISOString(),
        promiseRejection: true,
        // Try to extract more context from the rejection
        reasonType: typeof event.reason,
        reasonString: event.reason instanceof Error ? event.reason.message : String(event.reason),
      },
    };

    errorService.logError(event.reason, context).catch((logError) => {
      console.error("Failed to log unhandled rejection:", logError);
    });

    // Prevent default browser behavior (console error)
    event.preventDefault();
  });

  // Improve focus management for accessibility - add skip to main content link
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSkipLink);
  } else {
    addSkipLink();
  }

  function addSkipLink() {
    // Check if skip link already exists
    if (document.getElementById('skip-to-main')) return;

    const skipLink = document.createElement('a');
    skipLink.id = 'skip-to-main';
    skipLink.href = '#main-content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
};

/**
 * Initialize application when DOM is ready
 */
const init = (): void => {
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const rootElement = getRootElement();
      initializeApp(rootElement);
    });
  } else {
    // DOM is already ready
    const rootElement = getRootElement();
    initializeApp(rootElement);
  }

  // Setup global error handlers
  setupGlobalErrorHandlers();
};

// Start initialization
init();
