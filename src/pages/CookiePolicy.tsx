// src/pages/CookiePolicy.tsx
import React from "react";

const EFFECTIVE_DATE = "2025-01-01";

export default function CookiePolicy() {
  return (
    <main className="min-h-screen bg-[#071018] text-slate-100 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-[#0b0f14] rounded-2xl p-8 shadow-lg border border-slate-700">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Cookie Policy</h1>
          <div className="text-sm text-slate-400 mt-1">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </div>
        </header>

        <section className="space-y-6 text-slate-300 leading-relaxed">
          <h2 className="text-xl font-semibold">What are cookies?</h2>
          <p>Cookies are small text files stored in your browser that help websites remember information and provide better experiences.</p>

          <h2 className="text-xl font-semibold">How we use cookies</h2>
          <ul className="list-disc pl-6">
            <li><strong>Essential cookies:</strong> required for the site to work (authentication, security).</li>
            <li><strong>Analytics cookies:</strong> aggregate usage data to improve the product (e.g., Google Analytics or similar).</li>
            <li><strong>Functional cookies:</strong> remember preferences (theme, locale).</li>
            <li><strong>Advertising cookies:</strong> used only if you opt-in; we do not serve ads by default.</li>
          </ul>

          <h2 className="text-xl font-semibold">Third-party cookies</h2>
          <p>
            We may use third-party services (Stripe for payments, analytics providers). These parties have their own cookie policies.
          </p>

          <h2 className="text-xl font-semibold">Managing cookies</h2>
          <p>
            You can control & delete cookies via your browser settings. To opt out of analytics or advertising cookies, use the Cookie Preferences on our site or contact <a className="text-teal-300" href="mailto:support@prolight.ai">support@prolight.ai</a>.
          </p>

          <div className="mt-6 text-xs text-slate-500">
            This Cookie Policy is a summary. Implement a cookie preference center or consent manager if your users require opt-in for GDPR/CCPA compliance.
          </div>
        </section>
      </div>
    </main>
  );
}
