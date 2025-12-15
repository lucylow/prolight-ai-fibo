// src/pages/SignOut.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function SignOutPage() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState<"signing-out" | "signed-out" | "error">("signing-out");

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        setStatus("signed-out");
        toast.success("Signed out successfully");
        
        // Redirect after a brief delay to show success message
        const redirectTimer = setTimeout(() => {
          nav("/sign-in", { replace: true });
        }, 1000);
        
        return () => clearTimeout(redirectTimer);
      } catch (error) {
        console.error("Logout error:", error);
        setStatus("error");
        toast.error("Failed to sign out. Redirecting...");
        
        // Still redirect even on error after a delay
        const redirectTimer = setTimeout(() => {
          nav("/sign-in", { replace: true });
        }, 2000);
        
        return () => clearTimeout(redirectTimer);
      }
    };

    performLogout();
  }, [logout, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "signing-out" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-lg font-semibold">Signing out...</div>
            <div className="text-sm text-muted-foreground">Please wait</div>
          </>
        )}
        
        {status === "signed-out" && (
          <>
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="text-lg font-semibold">Signed out successfully</div>
            <div className="text-sm text-muted-foreground">Redirecting to sign in...</div>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="text-lg font-semibold">Sign out error</div>
            <div className="text-sm text-muted-foreground">Redirecting to sign in...</div>
          </>
        )}
      </div>
    </div>
  );
}
