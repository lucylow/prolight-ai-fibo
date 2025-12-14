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
    // Validate window and location are available
    if (typeof window === 'undefined' || !window.location) {
      throw new Error("Window or location object is not available");
    }

    try {
      window.location.reload();
    } catch (reloadError) {
      console.error("Failed to reload page:", reloadError);
      
      // Log the reload error
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'safeReload',
        metadata: {
          method: 'reload',
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(reloadError, context).catch((logError) => {
        console.error("Failed to log reload error:", logError);
      });

      // Fallback: try using location.replace as last resort
      try {
        if (window.location && window.location.replace) {
          window.location.replace(window.location.href);
        } else {
          throw new Error("location.replace is not available");
        }
      } catch (replaceError) {
        // If all else fails, at least log it
        console.error("All reload methods failed:", replaceError);
        
        const context: ErrorContext = {
          component: 'main.tsx',
          action: 'safeReload',
          metadata: {
            method: 'replace',
            timestamp: new Date().toISOString(),
          },
        };
        errorService.logError(replaceError, context).catch((logError) => {
          console.error("Failed to log replace error:", logError);
        });
      }
    }
  } catch (error) {
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'safeReload',
      metadata: {
        critical: true,
        timestamp: new Date().toISOString(),
      },
    };
    errorService.logError(error, context).catch((logError) => {
      console.error("Failed to log safeReload error:", logError);
    });
    console.error("Critical error in safeReload:", error);
  }
};

/**
 * Enhanced error handler with recovery mechanisms
 */
const handleInitializationError = (error: unknown, rootElement: HTMLElement): void => {
  try {
    console.error("Failed to initialize React application:", error);

    const errorObj = extractError(error);
    
    // Log error with context (fire and forget)
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'initializeApp',
      metadata: {
        initialization: true,
        rootElement: rootElement?.id || rootElement?.tagName || 'unknown',
        rootElementType: rootElement ? typeof rootElement : 'null',
        timestamp: new Date().toISOString(),
      },
    };
    
    errorService.logError(error, context).catch((logError) => {
      console.error("Failed to log initialization error:", logError);
    });

    // Validate rootElement before using it
    if (!rootElement || !(rootElement instanceof HTMLElement)) {
      throw new Error("Invalid rootElement provided to handleInitializationError");
    }

    // Clear root element and render error UI with React
    try {
      // Safely clear root element
      try {
        rootElement.innerHTML = "";
      } catch (clearError) {
        console.error("Failed to clear root element:", clearError);
        // Continue anyway - might still be able to render
      }

      let root;
      try {
        root = createRoot(rootElement);
      } catch (createRootError) {
        throw new Error(`Failed to create React root for error UI: ${createRootError instanceof Error ? createRootError.message : String(createRootError)}`);
      }
      
      const handleRetry = (): void => {
        try {
          safeReload();
        } catch (retryError) {
          console.error("Failed to retry:", retryError);
          // Fallback to basic reload
          try {
            window.location.reload();
          } catch {
            console.error("All retry methods failed");
          }
        }
      };

      const handleReload = (): void => {
        try {
          safeReload();
        } catch (reloadError) {
          console.error("Failed to reload:", reloadError);
          // Fallback to basic reload
          try {
            window.location.reload();
          } catch {
            console.error("All reload methods failed");
          }
        }
      };

      const handleClearStorage = (): void => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          }
        } catch (localStorageError) {
          console.error("Failed to clear localStorage:", localStorageError);
        }

        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
          }
        } catch (sessionStorageError) {
          console.error("Failed to clear sessionStorage:", sessionStorageError);
        }

        // Continue with reload even if clearing fails
        try {
          safeReload();
        } catch (reloadError) {
          console.error("Failed to reload after clearing storage:", reloadError);
          try {
            window.location.reload();
          } catch {
            console.error("All reload methods failed after clearing storage");
          }
        }
      };

      try {
        root.render(
          <InitializationError
            error={errorObj}
            onRetry={handleRetry}
            onReload={handleReload}
            onClearStorage={handleClearStorage}
          />
        );
      } catch (renderError) {
        throw new Error(`Failed to render InitializationError component: ${renderError instanceof Error ? renderError.message : String(renderError)}`);
      }
    } catch (renderError) {
      // If we can't even render the error UI, show a basic fallback
      console.error("Failed to render error UI:", renderError);
      
      // Log the render error
      const renderErrorContext: ErrorContext = {
        component: 'main.tsx',
        action: 'handleInitializationError',
        metadata: {
          originalError: errorObj.message,
          renderError: renderError instanceof Error ? renderError.message : String(renderError),
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(renderError, renderErrorContext).catch((logError) => {
        console.error("Failed to log render error:", logError);
      });

      // Try to show basic HTML fallback
      try {
        if (rootElement && rootElement instanceof HTMLElement) {
          rootElement.innerHTML = `
            <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
              <h1>Application Error</h1>
              <p>Failed to initialize the application. Please refresh the page.</p>
              <button onclick="try { window.location.reload(); } catch(e) { console.error('Reload failed:', e); }" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">
                Reload Page
              </button>
            </div>
          `;
        } else {
          // Last resort: try to write to document body
          if (document.body) {
            document.body.innerHTML = `
              <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
                <h1>Application Error</h1>
                <p>Failed to initialize the application. Please refresh the page.</p>
                <button onclick="try { window.location.reload(); } catch(e) { console.error('Reload failed:', e); }" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">
                  Reload Page
                </button>
              </div>
            `;
          }
        }
      } catch (fallbackError) {
        // If even the fallback fails, log it
        console.error("Failed to show fallback error UI:", fallbackError);
        console.error("Original error:", error);
        console.error("Render error:", renderError);
      }
    }
  } catch (handlerError) {
    // If the error handler itself fails, log it and try basic fallback
    console.error("Critical: Error handler failed:", handlerError);
    console.error("Original error:", error);
    
    try {
      if (document.body) {
        document.body.innerHTML = `
          <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
            <h1>Critical Error</h1>
            <p>The application encountered a critical error. Please refresh the page.</p>
            <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
              Reload Page
            </button>
          </div>
        `;
      }
    } catch {
      console.error("Unable to display any error message");
    }
  }
};

/**
 * Initialize React application with error handling
 */
const initializeApp = (rootElement: HTMLElement): void => {
  // Validate rootElement before proceeding
  if (!rootElement || !(rootElement instanceof HTMLElement)) {
    const error = new Error("Invalid root element provided to initializeApp");
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'initializeApp',
      metadata: {
        rootElementType: typeof rootElement,
        rootElementExists: !!rootElement,
        timestamp: new Date().toISOString(),
      },
    };
    errorService.logError(error, context).catch((logError) => {
      console.error("Failed to log validation error:", logError);
    });
    handleInitializationError(error, rootElement || document.body || document.documentElement);
    return;
  }

  try {
    // Validate React is available
    if (typeof React === 'undefined' || !createRoot) {
      throw new Error("React or createRoot is not available. Check if React is properly imported.");
    }

    let root;
    try {
      root = createRoot(rootElement);
    } catch (createRootError) {
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'createRoot',
        metadata: {
          rootElementId: rootElement.id,
          rootElementTag: rootElement.tagName,
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(createRootError, context).catch((logError) => {
        console.error("Failed to log createRoot error:", logError);
      });
      throw new Error(`Failed to create React root: ${createRootError instanceof Error ? createRootError.message : String(createRootError)}`);
    }

    try {
      root.render(
        <React.StrictMode>
          <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <App />
          </NextThemeProvider>
        </React.StrictMode>
      );
    } catch (renderError) {
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'renderApp',
        metadata: {
          rootElementId: rootElement.id,
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(renderError, context).catch((logError) => {
        console.error("Failed to log render error:", logError);
      });
      throw renderError;
    }
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
  try {
    let rootElement = document.getElementById("root");

    if (!rootElement) {
      // Validate document.body exists
      if (!document.body) {
        throw new Error("document.body is not available. DOM may not be fully loaded.");
      }

      try {
        rootElement = document.createElement("div");
        rootElement.id = "root";
        document.body.appendChild(rootElement);
      } catch (createError) {
        const context: ErrorContext = {
          component: 'main.tsx',
          action: 'createRootElement',
          metadata: {
            error: 'Failed to create or append root element',
            timestamp: new Date().toISOString(),
          },
        };
        errorService.logError(createError, context).catch((logError) => {
          console.error("Failed to log root element creation error:", logError);
        });
        throw new Error(`Failed to create root element: ${createError instanceof Error ? createError.message : String(createError)}`);
      }
    }

    // Validate the root element is valid
    if (!(rootElement instanceof HTMLElement)) {
      throw new Error("Root element is not a valid HTMLElement");
    }

    return rootElement;
  } catch (error) {
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'getRootElement',
      metadata: {
        timestamp: new Date().toISOString(),
        documentReadyState: document.readyState,
        bodyExists: !!document.body,
      },
    };
    errorService.logError(error, context).catch((logError) => {
      console.error("Failed to log getRootElement error:", logError);
    });
    throw error;
  }
};

/**
 * Setup global error handlers for unhandled errors
 */
const setupGlobalErrorHandlers = (): void => {
  try {
    // Handle synchronous errors
    try {
      window.addEventListener("error", (event) => {
        try {
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
        } catch (handlerError) {
          // Fallback logging if error handler itself fails
          console.error("Error in global error handler:", handlerError);
          console.error("Original error:", event.error || event.message);
        }

        // Don't prevent default - let ErrorBoundary handle it in React components
      });
    } catch (addListenerError) {
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'setupErrorListener',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(addListenerError, context).catch((logError) => {
        console.error("Failed to log error listener setup error:", logError);
      });
      console.error("Failed to setup error listener:", addListenerError);
    }

    // Handle unhandled promise rejections
    try {
      window.addEventListener("unhandledrejection", (event) => {
        try {
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
        } catch (handlerError) {
          // Fallback logging if rejection handler itself fails
          console.error("Error in unhandled rejection handler:", handlerError);
          console.error("Original rejection reason:", event.reason);
        }
      });
    } catch (addListenerError) {
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'setupRejectionListener',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
      errorService.logError(addListenerError, context).catch((logError) => {
        console.error("Failed to log rejection listener setup error:", logError);
      });
      console.error("Failed to setup rejection listener:", addListenerError);
    }

    // Improve focus management for accessibility - add skip to main content link
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          try {
            addSkipLink();
          } catch (skipLinkError) {
            const context: ErrorContext = {
              component: 'main.tsx',
              action: 'addSkipLink',
              metadata: {
                timestamp: new Date().toISOString(),
                trigger: 'DOMContentLoaded',
              },
            };
            errorService.logError(skipLinkError, context).catch((logError) => {
              console.error("Failed to log skip link error:", logError);
            });
            console.error("Failed to add skip link:", skipLinkError);
          }
        });
      } else {
        addSkipLink();
      }
    } catch (skipLinkSetupError) {
      const context: ErrorContext = {
        component: 'main.tsx',
        action: 'setupSkipLink',
        metadata: {
          timestamp: new Date().toISOString(),
          documentReadyState: document.readyState,
        },
      };
      errorService.logError(skipLinkSetupError, context).catch((logError) => {
        console.error("Failed to log skip link setup error:", logError);
      });
      console.error("Failed to setup skip link:", skipLinkSetupError);
    }

    function addSkipLink() {
      try {
        // Check if skip link already exists
        if (document.getElementById('skip-to-main')) return;

        // Validate document.body exists
        if (!document.body) {
          throw new Error("document.body is not available for skip link");
        }

        const skipLink = document.createElement('a');
        skipLink.id = 'skip-to-main';
        skipLink.href = '#main-content';
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg';
        skipLink.textContent = 'Skip to main content';
        
        try {
          document.body.insertBefore(skipLink, document.body.firstChild);
        } catch (insertError) {
          // Fallback: try appendChild if insertBefore fails
          try {
            document.body.appendChild(skipLink);
          } catch (appendError) {
            throw new Error(`Failed to insert skip link: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
          }
        }
      } catch (skipLinkError) {
        const context: ErrorContext = {
          component: 'main.tsx',
          action: 'addSkipLink',
          metadata: {
            timestamp: new Date().toISOString(),
            bodyExists: !!document.body,
          },
        };
        errorService.logError(skipLinkError, context).catch((logError) => {
          console.error("Failed to log skip link creation error:", logError);
        });
        // Don't throw - skip link is not critical for app functionality
        console.error("Failed to add skip link:", skipLinkError);
      }
    }
  } catch (setupError) {
    const context: ErrorContext = {
      component: 'main.tsx',
      action: 'setupGlobalErrorHandlers',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
    errorService.logError(setupError, context).catch((logError) => {
      console.error("Failed to log global error handlers setup error:", logError);
    });
    console.error("Failed to setup global error handlers:", setupError);
    // Don't throw - continue with app initialization even if error handlers fail
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
