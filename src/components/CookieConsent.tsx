// src/components/CookieConsent.tsx
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "prolight_cookie_pref";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [prefs, setPrefs] = useState<{ analytics: boolean; functional: boolean }>({ analytics: true, functional: true });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setShow(true);
      } else {
        const parsed = JSON.parse(raw);
        setPrefs(parsed);
      }
    } catch (e) {
      setShow(true);
    }
  }, []);

  function acceptAll() {
    const p = { analytics: true, functional: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setPrefs(p);
    setShow(false);
    // initialize analytics etc.
  }

  function savePrefs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 z-50">
      <div className="bg-[#091318] border border-slate-700 p-4 rounded-xl shadow-lg max-w-3xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-1">
          <h4 className="font-semibold text-white">We use cookies</h4>
          <p className="text-slate-400 text-sm">We use cookies to improve performance and analyze usage. You can choose which cookies to enable.</p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefs.analytics} 
                onChange={(e)=>setPrefs({...prefs, analytics: e.target.checked})}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-2 focus:ring-teal-500"
              />
              Analytics
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefs.functional} 
                onChange={(e)=>setPrefs({...prefs, functional: e.target.checked})}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-2 focus:ring-teal-500"
              />
              Functional
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={acceptAll} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded text-black font-semibold transition-colors">Accept all</button>
            <button onClick={savePrefs} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-100 transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
