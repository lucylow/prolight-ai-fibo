import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error
              ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive animate-shake"
              : "border-input focus-visible:ring-ring focus-visible:border-primary/50 hover:border-primary/30",
            className,
          )}
          ref={ref}
          aria-invalid={error}
          aria-describedby={helperText ? `${props.id || 'input'}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p 
            id={`${props.id || 'input'}-helper`}
            className={cn(
              "mt-1.5 text-xs transition-opacity duration-200",
              error ? "text-destructive animate-fade-in" : "text-muted-foreground"
            )}
            role={error ? "alert" : undefined}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
