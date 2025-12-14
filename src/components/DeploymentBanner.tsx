import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Deployment verification banner - only visible in development or when explicitly enabled
 */
export const DeploymentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(() => {
    // Check if user has dismissed it before
    return localStorage.getItem('deployment-banner-dismissed') === 'true';
  });

  React.useEffect(() => {
    // Only show in development or if explicitly enabled via env var
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const showBanner = import.meta.env.VITE_SHOW_DEPLOY_BANNER === 'true';
    setIsVisible((isDev || showBanner) && !isDismissed);
  }, [isDismissed]);

  if (!isVisible) return null;

  const buildTime = typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__ 
    ? new Date(__BUILD_TIME__).toLocaleString() 
    : 'dev mode';
  const commitHash = typeof __COMMIT_HASH__ !== 'undefined' && __COMMIT_HASH__ 
    ? __COMMIT_HASH__.slice(0, 7)
    : 'local';

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('deployment-banner-dismissed', 'true');
    setIsVisible(false);
  };
  
  return (
    <div 
      className="fixed bottom-0 right-0 z-50 max-w-sm p-3 m-4 rounded-lg shadow-lg border border-border/50 bg-muted/95 backdrop-blur-sm text-xs font-mono transition-all duration-300"
      role="status"
      aria-label="Build information"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-foreground">Build Info</span>
          </div>
          <div className="space-y-0.5 text-muted-foreground">
            <div>Time: <span className="text-foreground">{buildTime}</span></div>
            <div>Commit: <span className="text-foreground font-mono">{commitHash}</span></div>
          </div>
        </div>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-6 w-6"
          aria-label="Dismiss build information"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
