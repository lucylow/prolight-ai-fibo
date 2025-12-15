import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// Get root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there is a <div id='root'></div> in your HTML.");
}

// Create root with error handling
try {
  const root = createRoot(rootElement);
  
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  // Handle errors during app initialization
  console.error("Failed to render application:", error);
  
  // Display error to user
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
      <div>
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #dc2626;">Failed to Initialize Application</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">An error occurred while starting the application. Please refresh the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;"
        >
          Refresh Page
        </button>
      </div>
    </div>
  `;
}
