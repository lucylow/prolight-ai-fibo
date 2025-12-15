/**
 * RBACGate component - Role-based access control gate
 * Conditionally renders children based on user role
 */
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface RBACGateProps {
  roles: ("admin" | "editor" | "viewer")[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "hide" | "disable"; // hide: don't render, disable: render but disable
}

export const RBACGate: React.FC<RBACGateProps> = ({
  roles,
  children,
  fallback = null,
  mode = "hide",
}) => {
  const { user } = useAuth();
  
  const hasAccess = user && roles.includes(user.role);
  
  if (!hasAccess) {
    if (mode === "disable") {
      return (
        <div className="opacity-50 pointer-events-none" aria-disabled="true">
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * RBACButton - Wrapper for buttons that need role-based access
 */
interface RBACButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  roles: ("admin" | "editor" | "viewer")[];
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive" | "ghost" | "link" | "secondary";
}

export const RBACButton: React.FC<RBACButtonProps> = ({
  roles,
  children,
  variant = "default",
  className,
  ...buttonProps
}) => {
  const { user } = useAuth();
  const hasAccess = user && roles.includes(user.role);
  
  const variantClasses: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };
  
  return (
    <button
      {...buttonProps}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-10 px-4 py-2 ${variantClasses[variant] || variantClasses.default} ${className || ""}`}
      disabled={buttonProps.disabled || !hasAccess}
      aria-disabled={buttonProps.disabled || !hasAccess}
      title={
        !hasAccess
          ? `This action requires one of the following roles: ${roles.join(", ")}`
          : buttonProps.title
      }
    >
      {children}
    </button>
  );
};

