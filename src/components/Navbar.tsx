// src/components/Navbar.tsx
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AccountDropdown from "./AccountDropdown";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <nav className="bg-[#071018]/95 backdrop-blur-md border-b border-slate-800/50 sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
              aria-label="ProLight Home"
            >
              <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-amber-400 flex items-center justify-center text-black font-bold transition-transform duration-200 group-hover:scale-110 shadow-lg shadow-teal-400/20">
                PL
              </div>
              <span className="font-semibold text-white">ProLight</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1 ml-6">
              <NavLink 
                to="/studio" 
                className={({isActive}) => cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
                  isActive 
                    ? "text-teal-300 bg-teal-500/10" 
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                )}
              >
                Studio
                {({isActive}: {isActive: boolean}) => isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full" />
                )}
              </NavLink>
              <NavLink 
                to="/pricing" 
                className={({isActive}) => cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "text-teal-300 bg-teal-500/10" 
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                )}
              >
                Pricing
              </NavLink>
              <NavLink 
                to="/docs" 
                className={({isActive}) => cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "text-teal-300 bg-teal-500/10" 
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                )}
              >
                Docs
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <NavLink 
                to="/billing" 
                className={({isActive}) => cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-teal-300 bg-teal-500/10"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                )}
              >
                Billing
              </NavLink>
            </div>

            <div className="hidden md:block">
              {user ? (
                <AccountDropdown />
              ) : (
                <Link 
                  to="/sign-in" 
                  className="px-4 py-2 bg-teal-500 text-black rounded-md font-medium hover:bg-teal-400 transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25 active:scale-95"
                >
                  Sign in
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setOpen(!open)} 
                className="p-2 rounded-md bg-[#061018] hover:bg-slate-800/50 transition-all duration-200 active:scale-95"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
              >
                <svg 
                  className="w-6 h-6 text-slate-300 transition-transform duration-200" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#061018] border-t border-slate-800/50 animate-in slide-in-from-top duration-200">
          <div className="px-4 py-3 space-y-1">
            <NavLink 
              to="/studio" 
              onClick={() => setOpen(false)}
              className={({isActive}) => cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-teal-300 bg-teal-500/10"
                  : "text-slate-200 hover:text-white hover:bg-slate-800/50"
              )}
            >
              Studio
            </NavLink>
            <NavLink 
              to="/pricing" 
              onClick={() => setOpen(false)}
              className={({isActive}) => cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-teal-300 bg-teal-500/10"
                  : "text-slate-200 hover:text-white hover:bg-slate-800/50"
              )}
            >
              Pricing
            </NavLink>
            <NavLink 
              to="/docs" 
              onClick={() => setOpen(false)}
              className={({isActive}) => cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-teal-300 bg-teal-500/10"
                  : "text-slate-200 hover:text-white hover:bg-slate-800/50"
              )}
            >
              Docs
            </NavLink>
            <NavLink 
              to="/billing" 
              onClick={() => setOpen(false)}
              className={({isActive}) => cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-teal-300 bg-teal-500/10"
                  : "text-slate-200 hover:text-white hover:bg-slate-800/50"
              )}
            >
              Billing
            </NavLink>
            <div className="pt-2 border-t border-slate-800/50 mt-2">
              {user ? (
                <AccountDropdown mobile />
              ) : (
                <Link 
                  to="/sign-in" 
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 bg-teal-500 rounded-md text-black font-medium text-center hover:bg-teal-400 transition-all duration-200 active:scale-95"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

