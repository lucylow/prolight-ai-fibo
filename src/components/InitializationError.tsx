import React from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserErrorMessage } from "@/services/errorService";

interface InitializationErrorProps {
  error: Error;
  onRetry: () => void;
  onReload: () => void;
  onClearStorage: () => void;
}

/**
 * React component for displaying initialization errors
 */
export const InitializationError: React.FC<InitializationErrorProps> = ({
  error,
  onRetry,
  onReload,
  onClearStorage,
}) => {
  const isDev = import.meta.env.DEV;
  const hasStack = isDev && error.stack;
  const userMessage = getUserErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div className="flex-1">
              <CardTitle>Application Error</CardTitle>
              <CardDescription>Failed to initialize the application.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-md border">
            <p className="text-sm text-muted-foreground break-words" aria-label="Error details">
              {userMessage}
            </p>
          </div>

          {hasStack && (
            <details className="p-3 bg-muted rounded-md border">
              <summary className="text-sm font-medium cursor-pointer mb-2 select-none">
                Stack Trace (Development)
              </summary>
              <pre
                className="text-xs text-muted-foreground overflow-auto max-h-[300px] font-mono whitespace-pre-wrap break-all mt-2"
                aria-label="Error stack trace"
              >
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Error recovery actions">
            <Button
              onClick={onRetry}
              className="flex-1"
              aria-label="Retry application initialization"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              onClick={onReload}
              variant="secondary"
              className="flex-1"
              aria-label="Reload the page"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button
              onClick={onClearStorage}
              variant="destructive"
              className="flex-1"
              aria-label="Clear storage and reload"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Storage & Reload
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            If this problem persists, please contact support with the error details above.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
