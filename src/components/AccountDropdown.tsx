// src/components/AccountDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AccountDropdown({ mobile = false }: { mobile?: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  if (!user) {
    return null;
  }

  const handleSignOutClick = () => {
    setOpen(false);
    setShowSignOutDialog(true);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      toast.success("Signed out successfully");
      nav("/sign-in", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className={`relative ${mobile ? "block" : "inline-block"}`} ref={ref}>
      <button onClick={() => setOpen((s) => !s)} className="flex items-center gap-2 p-1 rounded hover:bg-[#061018]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-amber-400 flex items-center justify-center font-bold text-black">{(user.name || user.email || "U").charAt(0).toUpperCase()}</div>
        {!mobile && <div className="text-sm text-slate-200">{user.name || user.email}</div>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[#0b0f14] border border-slate-700 rounded shadow py-2 z-50">
          <Link 
            to="/account" 
            className="block px-4 py-2 text-sm text-slate-200 hover:bg-[#071018]"
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <Link 
            to="/billing" 
            className="block px-4 py-2 text-sm text-slate-200 hover:bg-[#071018]"
            onClick={() => setOpen(false)}
          >
            Billing
          </Link>
          <button 
            onClick={handleSignOutClick} 
            className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-[#071018] flex items-center gap-2"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      )}

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={signingOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {signingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Sign out"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
