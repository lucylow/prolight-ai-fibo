// src/components/AccountDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AccountDropdown({ mobile = false }: { mobile?: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
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

  const handleSignOut = async () => {
    try {
      await logout();
      nav("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
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
          <Link to="/account" className="block px-4 py-2 text-sm text-slate-200 hover:bg-[#071018]">Account</Link>
          <Link to="/billing" className="block px-4 py-2 text-sm text-slate-200 hover:bg-[#071018]">Billing</Link>
          <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-[#071018]">Sign out</button>
        </div>
      )}
    </div>
  );
}
