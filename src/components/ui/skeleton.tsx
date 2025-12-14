import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-md bg-muted relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )} 
      {...props} 
    />
  );
}

// Pre-built skeleton variants for common use cases
function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6", className)}>
      <Skeleton className="h-6 w-1/2" />
      <SkeletonText lines={3} />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SkeletonAvatar({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-12 w-12",
  };
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size])} />
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };
