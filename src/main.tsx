import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider as NextThemeProvider } from "next-themes";

// Error handling for root element and React initialization
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Failed to find the root element. Please ensure there is a div with id='root' in your HTML."
  );
}

try {
  const root = createRoot(rootElement);
  root.render(
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </NextThemeProvider>
  );
} catch (error) {
  console.error("Failed to initialize React application:", error);
  
  // Display user-friendly error message
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
      <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
      <p style="color: #525252; margin-bottom: 0.5rem;">
        Failed to initialize the application.
      </p>
      <p style="color: #737373; font-size: 0.875rem; margin-bottom: 1.5rem;">
        Please refresh the page or contact support if the problem persists.
      </p>
      <button 
        onclick="window.location.reload()" 
        style="
          padding: 0.5rem 1rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
        "
      >
        Refresh Page
      </button>
    </div>
  `;
  
  // Re-throw for error tracking services
  throw error;
}
