import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Enhanced error handler with recovery mechanisms
 */
const handleInitializationError = (error: unknown, rootElement: HTMLElement): void => {
  console.error("Failed to initialize React application:", error);
  
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : "";
  
  // Log to error tracking service in production
  if (import.meta.env.PROD) {
    // You can integrate with error reporting services here
    // e.g., Sentry, LogRocket, etc.
    try {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error);
    } catch (trackingError) {
      console.error("Failed to log error to tracking service:", trackingError);
    }
  }
  
  // Display user-friendly error message with retry mechanism
  rootElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      background: #f5f5f5;
    ">
      <h1 style="color: #dc2626; margin-bottom: 1rem; font-size: 1.5rem;">Application Error</h1>
      <p style="color: #525252; margin-bottom: 0.5rem; font-size: 1rem;">
        Failed to initialize the application.
      </p>
      <p style="color: #737373; font-size: 0.875rem; margin-bottom: 1.5rem; max-width: 500px;">
        ${errorMessage}
      </p>
      ${import.meta.env.DEV && errorStack ? `
        <details style="
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 0.375rem;
          max-width: 600px;
          text-align: left;
          max-height: 300px;
          overflow: auto;
        ">
          <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">Stack Trace (Development)</summary>
          <pre style="font-size: 0.75rem; color: #666; white-space: pre-wrap; word-break: break-all;">${errorStack}</pre>
        </details>
      ` : ''}
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
        <button 
          id="retry-button"
          style="
            padding: 0.75rem 1.5rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#1d4ed8'"
          onmouseout="this.style.background='#2563eb'"
        >
          Retry
        </button>
        <button 
          id="reload-button"
          style="
            padding: 0.75rem 1.5rem;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#4b5563'"
          onmouseout="this.style.background='#6b7280'"
        >
          Reload Page
        </button>
        <button 
          id="clear-storage-button"
          style="
            padding: 0.75rem 1.5rem;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#b91c1c'"
          onmouseout="this.style.background='#dc2626'"
        >
          Clear Storage & Reload
        </button>
      </div>
      <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 1.5rem;">
        If this problem persists, please contact support with the error details above.
      </p>
    </div>
  `;
  
  // Add event listeners for buttons
  const retryButton = document.getElementById("retry-button");
  const reloadButton = document.getElementById("reload-button");
  const clearStorageButton = document.getElementById("clear-storage-button");
  
  if (retryButton) {
    retryButton.addEventListener("click", () => {
      try {
        // Attempt to reinitialize
        const newRoot = createRoot(rootElement);
        newRoot.render(
          React.createElement(NextThemeProvider, {
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true
          }, React.createElement(App))
        );
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        window.location.reload();
      }
    });
  }
  
  if (reloadButton) {
    reloadButton.addEventListener("click", () => {
      window.location.reload();
    });
  }
  
  if (clearStorageButton) {
    clearStorageButton.addEventListener("click", () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } catch (clearError) {
        console.error("Failed to clear storage:", clearError);
        window.location.reload();
      }
    });
  }
};

// Error handling for root element and React initialization
const rootElement = document.getElementById("root");

if (!rootElement) {
  // Try to create root element if it doesn't exist
  const newRootElement = document.createElement("div");
  newRootElement.id = "root";
  document.body.appendChild(newRootElement);
  
  // Retry initialization
  try {
    const root = createRoot(newRootElement);
    root.render(
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </NextThemeProvider>
    );
  } catch (error) {
    handleInitializationError(error, newRootElement);
    throw error;
  }
} else {
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
}

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
