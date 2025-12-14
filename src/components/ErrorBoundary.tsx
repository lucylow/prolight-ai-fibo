import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserErrorMessage, isErrorRetryable, errorService, type ErrorContext } from '@/services/errorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isOnline: boolean;
}

type RetryTimeoutId = ReturnType<typeof setTimeout>;

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: RetryTimeoutId | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isOnline: navigator.onLine,
    };
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log error with context
    const context: ErrorContext = {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
      },
    };

    errorService.logError(error, context).catch((loggingError) => {
      console.error('Failed to log error to error service:', loggingError);
    });
  }

  handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    if (!this.state.isOnline) {
      return; // Don't retry if offline
    }

    // Clear error state and retry
    this.handleReset();
    
    // Force a small delay to allow state to reset
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.retryTimeoutId = setTimeout(() => {
      // Trigger a re-render by updating a dummy state
      this.forceUpdate();
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, isOnline } = this.state;
      const isDevelopment = import.meta.env.DEV;
      const userMessage = error ? getUserErrorMessage(error) : 'An unexpected error occurred';
      const canRetry = error ? isErrorRetryable(error) : false;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div className="flex-1">
                  <CardTitle>Something went wrong</CardTitle>
                  <CardDescription>
                    {userMessage}
                  </CardDescription>
                </div>
                {!isOnline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-xs">Offline</span>
                  </div>
                )}
                {isOnline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wifi className="w-4 h-4" />
                    <span className="text-xs">Online</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOnline && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    You appear to be offline. Please check your internet connection and try again.
                  </p>
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Error details:</p>
                <p className="text-sm text-muted-foreground font-mono break-words">
                  {error?.message || 'Unknown error'}
                </p>
              </div>

              {isDevelopment && errorInfo && (
                <details className="p-4 bg-muted rounded-lg">
                  <summary className="text-sm font-medium cursor-pointer mb-2">
                    Stack trace (development only)
                  </summary>
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-64 font-mono whitespace-pre-wrap break-words">
                    {error?.stack}
                    {'\n\n'}
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                {canRetry && isOnline && (
                  <Button 
                    onClick={this.handleRetry} 
                    variant="default" 
                    className="flex-1"
                    disabled={!isOnline}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button onClick={this.handleReset} variant={canRetry ? "outline" : "default"} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              {this.state.retryCount > 0 && (
                <p className="mb-2">Retry attempts: {this.state.retryCount}</p>
              )}
              If this problem persists, please contact support with the error details above.
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
