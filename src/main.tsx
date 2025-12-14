import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { getUserErrorMessage, errorService, type ErrorContext } from "@/services/errorService";

/**
 * Error information extracted from error object
 */
interface ErrorInfo {
  message: string;
  stack?: string;
}

/**
 * Extract error information from unknown error type
 */
const extractErrorInfo = (error: unknown): ErrorInfo => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Unknown error occurred" };
};


/**
 * Inject error UI styles into the document
 */
const injectErrorStyles = (): void => {
  // Check if styles already exist
  if (document.getElementById("error-ui-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "error-ui-styles";
  style.textContent = `
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);
    }
    @media (min-width: 640px) {
      .error-container {
        padding: 2rem;
      }
    }
    .error-content {
      max-width: 600px;
      width: 100%;
    }
    .error-title {
      color: #dc2626;
      margin-bottom: 0.75rem;
      font-size: 1.25rem;
      font-weight: 600;
    }
    @media (min-width: 640px) {
      .error-title {
        margin-bottom: 1rem;
        font-size: 1.5rem;
      }
    }
    .error-description {
      color: #525252;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    @media (min-width: 640px) {
      .error-description {
        font-size: 1rem;
      }
    }
    .error-message {
      color: #737373;
      font-size: 0.8125rem;
      margin-bottom: 1.25rem;
      word-break: break-word;
      padding: 0.625rem;
      background: #fff;
      border-radius: 0.375rem;
      border: 1px solid #e5e5e5;
    }
    @media (min-width: 640px) {
      .error-message {
        font-size: 0.875rem;
        margin-bottom: 1.5rem;
        padding: 0.75rem;
      }
    }
    .error-stack-details {
      margin-bottom: 1.25rem;
      padding: 0.75rem;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 0.375rem;
      text-align: left;
      max-height: 200px;
      overflow: auto;
    }
    @media (min-width: 640px) {
      .error-stack-details {
        margin-bottom: 1.5rem;
        padding: 1rem;
        max-height: 300px;
      }
    }
    .error-stack-summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #525252;
      font-size: 0.875rem;
      padding: 0.5rem;
      -webkit-tap-highlight-color: transparent;
    }
    @media (min-width: 640px) {
      .error-stack-summary {
        font-size: 1rem;
        padding: 0;
      }
    }
    .error-stack-pre {
      font-size: 0.6875rem;
      color: #666;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      line-height: 1.5;
    }
    @media (min-width: 640px) {
      .error-stack-pre {
        font-size: 0.75rem;
      }
    }
    .error-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      margin-bottom: 1.25rem;
    }
    @media (min-width: 640px) {
      .error-actions {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
    }
    .error-button {
      padding: 0.875rem 1.25rem;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.2s, transform 0.1s;
      min-height: 44px;
      width: 100%;
      -webkit-tap-highlight-color: transparent;
    }
    @media (min-width: 640px) {
      .error-button {
        padding: 0.75rem 1.5rem;
        width: auto;
      }
    }
    .error-button:hover {
      transform: translateY(-1px);
    }
    @media (hover: none) {
      .error-button:hover {
        transform: none;
      }
    }
    .error-button:active {
      transform: scale(0.98);
    }
    .error-button-primary {
      background-color: #2563eb;
    }
    .error-button-primary:hover {
      background-color: #1d4ed8;
    }
    .error-button-secondary {
      background-color: #6b7280;
    }
    .error-button-secondary:hover {
      background-color: #4b5563;
    }
    .error-button-danger {
      background-color: #dc2626;
    }
    .error-button-danger:hover {
      background-color: #b91c1c;
    }
    .error-help {
      color: #9ca3af;
      font-size: 0.6875rem;
      margin: 0;
      line-height: 1.5;
    }
    @media (min-width: 640px) {
      .error-help {
        font-size: 0.75rem;
      }
    }
  `;
  document.head.appendChild(style);
};

/**
 * Create error UI element with proper structure and accessibility
 */
const createErrorUI = (errorInfo: ErrorInfo): HTMLElement => {
  // Inject styles first
  injectErrorStyles();

  const container = document.createElement("div");
  container.className = "error-container";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "assertive");

  const isDev = import.meta.env.DEV;
  const hasStack = isDev && errorInfo.stack;

  container.innerHTML = `
    <div class="error-content">
      <h1 class="error-title">Application Error</h1>
      <p class="error-description">
        Failed to initialize the application.
      </p>
      <p class="error-message" aria-label="Error details">
        ${escapeHtml(getUserErrorMessage(errorInfo))}
      </p>
      ${hasStack ? `
        <details class="error-stack-details">
          <summary class="error-stack-summary">Stack Trace (Development)</summary>
          <pre class="error-stack-pre" aria-label="Error stack trace">${escapeHtml(errorInfo.stack || "")}</pre>
        </details>
      ` : ""}
      <div class="error-actions" role="group" aria-label="Error recovery actions">
        <button 
          id="retry-button"
          class="error-button error-button-primary"
          type="button"
          aria-label="Retry application initialization"
        >
          Retry
        </button>
        <button 
          id="reload-button"
          class="error-button error-button-secondary"
          type="button"
          aria-label="Reload the page"
        >
          Reload Page
        </button>
        <button 
          id="clear-storage-button"
          class="error-button error-button-danger"
          type="button"
          aria-label="Clear storage and reload"
        >
          Clear Storage & Reload
        </button>
      </div>
      <p class="error-help">
        If this problem persists, please contact support with the error details above.
      </p>
    </div>
  `;

  return container;
};

/**
 * Escape HTML to prevent XSS attacks
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Attach event listeners to error recovery buttons
 */
const attachErrorButtonListeners = (container: HTMLElement): void => {
  const retryButton = container.querySelector<HTMLButtonElement>("#retry-button");
  const reloadButton = container.querySelector<HTMLButtonElement>("#reload-button");
  const clearStorageButton = container.querySelector<HTMLButtonElement>("#clear-storage-button");

  retryButton?.addEventListener("click", () => {
    try {
      window.location.reload();
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      window.location.reload();
    }
  });

  reloadButton?.addEventListener("click", () => {
    window.location.reload();
  });

  clearStorageButton?.addEventListener("click", () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (clearError) {
      console.error("Failed to clear storage:", clearError);
      window.location.reload();
    }
  });
};

/**
 * Enhanced error handler with recovery mechanisms
 */
const handleInitializationError = (error: unknown, rootElement: HTMLElement): void => {
  console.error("Failed to initialize React application:", error);

  const errorInfo = extractErrorInfo(error);
  
  // Log error with context (fire and forget)
  const context: ErrorContext = {
    component: 'main.tsx',
    action: 'initializeApp',
    metadata: {
      initialization: true,
      rootElement: rootElement.id || 'root',
    },
  };
  
  errorService.logError(error, context).catch((logError) => {
    console.error("Failed to log initialization error:", logError);
  });

  // Clear root element and create error UI
  rootElement.innerHTML = "";
  const errorUI = createErrorUI(errorInfo);
  rootElement.appendChild(errorUI);

  // Attach event listeners
  attachErrorButtonListeners(errorUI);
};

/**
 * Initialize React application with error handling
 */
const initializeApp = (rootElement: HTMLElement): void => {
  try {
    const root = createRoot(rootElement);
    root.render(
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </NextThemeProvider>
    );
  } catch (error) {
    handleInitializationError(error, rootElement);
    throw error;
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

// Initialize application
const rootElement = getRootElement();
initializeApp(rootElement);

// Global error handlers for unhandled errors
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  // Don't prevent default - let ErrorBoundary handle it
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  // Prevent default browser behavior
  event.preventDefault();
});
