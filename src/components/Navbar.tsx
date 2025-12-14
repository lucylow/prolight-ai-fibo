// src/components/Navbar.tsx
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AccountDropdown from "./AccountDropdown";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="bg-[#071018] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-amber-400 flex items-center justify-center text-black font-bold">PL</div>
              <span className="font-semibold text-white">ProLight</span>
            </Link>
            <div className="hidden md:flex items-center space-x-2 ml-6">
              <NavLink to="/studio" className={({isActive})=>isActive ? "text-teal-300" : "text-slate-300"}>Studio</NavLink>
              <NavLink to="/pricing" className={({isActive})=>isActive ? "text-teal-300" : "text-slate-300"}>Pricing</NavLink>
              <NavLink to="/docs" className={({isActive})=>isActive ? "text-teal-300" : "text-slate-300"}>Docs</NavLink>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <NavLink to="/billing" className="text-slate-300 hover:text-white">Billing</NavLink>
            </div>

            <div className="hidden md:block">
              {user ? <AccountDropdown /> : <Link to="/sign-in" className="px-3 py-1 bg-teal-500 text-black rounded">Sign in</Link>}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={()=>setOpen(!open)} className="p-2 rounded bg-[#061018]">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#061018] border-t border-slate-800">
          <div className="px-4 py-3 space-y-2">
            <NavLink to="/studio" className="block text-slate-200">Studio</NavLink>
            <NavLink to="/pricing" className="block text-slate-200">Pricing</NavLink>
            <NavLink to="/docs" className="block text-slate-200">Docs</NavLink>
            <NavLink to="/billing" className="block text-slate-200">Billing</NavLink>
            <div className="pt-2 border-t border-slate-800">
              {user ? <AccountDropdown mobile /> : <Link to="/sign-in" className="block px-3 py-2 bg-teal-500 rounded text-black">Sign in</Link>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
