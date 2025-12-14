// src/pages/SignOut.tsx
import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SignOutPage() {
  const { logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    logout();
    const t = setTimeout(() => nav("/sign-in"), 500);
    return () => clearTimeout(t);
  }, [logout, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#071018] text-slate-300">
      <div className="text-center">
        <div className="text-xl font-semibold">Signing out…</div>
      </div>
    </div>
  );
}
