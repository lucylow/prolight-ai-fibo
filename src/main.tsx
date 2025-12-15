import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "./utils/env";

// Unregister service workers in development to prevent caching issues
if (import.meta.env.DEV) {
  import("./utils/unregisterServiceWorker.dev");
}

// Validate environment variables on startup
validateEnv();

/**
 * Initialize React application
 */
const init = (): void => {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </NextThemeProvider>
    </StrictMode>
  );
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
