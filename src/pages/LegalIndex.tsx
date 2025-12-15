// src/pages/LegalIndex.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function LegalIndex() {
  return (
    <div className="min-h-screen bg-[#071018] text-slate-100 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-[#0b0f14] rounded-2xl p-8 shadow-lg border border-slate-700">
        <h1 className="text-3xl font-bold mb-2">Legal & Policies</h1>
        <p className="text-slate-400 mb-6">
          Welcome to the legal center for <strong>ProLight AI</strong>. Below you'll find our core legal documents, including our Privacy Policy, Terms of Service, and Cookie Policy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/legal/privacy" className="block p-4 rounded-lg bg-[#06121a] hover:bg-[#0a1c24] border border-slate-800">
            <h3 className="font-semibold">Privacy Policy</h3>
            <p className="text-xs text-slate-400 mt-2">How we collect, use, and protect your data.</p>
          </Link>

          <Link to="/legal/terms" className="block p-4 rounded-lg bg-[#06121a] hover:bg-[#0a1c24] border border-slate-800">
            <h3 className="font-semibold">Terms of Service</h3>
            <p className="text-xs text-slate-400 mt-2">Rules and legal terms for using ProLight AI.</p>
          </Link>

          <Link to="/legal/cookies" className="block p-4 rounded-lg bg-[#06121a] hover:bg-[#0a1c24] border border-slate-800">
            <h3 className="font-semibold">Cookie Policy</h3>
            <p className="text-xs text-slate-400 mt-2">Which cookies we use and why, with opt-out info.</p>
          </Link>
        </div>

        <div className="mt-8 text-sm text-slate-400">
          <p>Need help or have questions? Contact <a href="mailto:support@prolight.ai" className="text-teal-300">support@prolight.ai</a>.</p>
          <p className="mt-2">Repository link: <a className="text-slate-200 underline" href="https://github.com/lucylow/prolight-ai-fibo" target="_blank" rel="noreferrer">github.com/lucylow/prolight-ai-fibo</a></p>
        </div>
      </div>
    </div>
  );
}

