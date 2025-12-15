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
}

export const RBACButton: React.FC<RBACButtonProps> = ({
  roles,
  children,
  ...buttonProps
}) => {
  const { user } = useAuth();
  const hasAccess = user && roles.includes(user.role);
  
  return (
    <button
      {...buttonProps}
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
