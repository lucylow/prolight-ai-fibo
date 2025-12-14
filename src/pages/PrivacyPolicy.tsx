// src/pages/PrivacyPolicy.tsx
import React from "react";

const EFFECTIVE_DATE = "2025-01-01";
const VERSION = "1.0";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#071018] text-slate-100 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-[#0b0f14] rounded-2xl p-8 shadow-lg border border-slate-700">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <div className="text-sm text-slate-400 mt-1">
            Effective date: <strong>{EFFECTIVE_DATE}</strong> • Version: {VERSION}
          </div>
        </header>

        <section className="space-y-6 text-slate-300 leading-relaxed">
          <h2 className="text-xl font-semibold">1. Overview</h2>
          <p>
            <strong>ProLight AI</strong> ("we", "us", "our") respects your privacy.
            This policy explains how we collect, use, disclose, and protect personal information.
          </p>

          <h2 className="text-xl font-semibold">2. What we collect</h2>
          <ul className="list-disc pl-6">
            <li>Account information (email, name, company).</li>
            <li>Usage data and analytics (feature use, API calls, logs).</li>
            <li>Media and content you upload (images, videos) — only as required to provide the service.</li>
            <li>Billing and payment information (via Stripe; we do not store raw card numbers).</li>
          </ul>

          <h2 className="text-xl font-semibold">3. How we use your data</h2>
          <p>
            We use data to operate and improve the service, provide customer support, bill for subscriptions, and comply with legal obligations. We may also use aggregated, non-identifying data for research and product development.
          </p>

          <h2 className="text-xl font-semibold">4. Sharing & third parties</h2>
          <p>
            We share data with: Stripe (payments), Bria (MCP execution via our backend), hosting providers, analytics providers, and as required by law. We require our processors to follow industry-standard security practices.
          </p>

          <h2 className="text-xl font-semibold">5. User controls</h2>
          <p>
            You can access, update, or delete your account information via the account settings. To request data deletion or export, contact <a className="text-teal-300" href="mailto:support@prolight.ai">support@prolight.ai</a>.
          </p>

          <h2 className="text-xl font-semibold">6. Data retention & security</h2>
          <p>
            We retain personal data for the duration necessary to provide the service and meet our legal obligations. We implement reasonable technical and organizational measures to protect data.
          </p>

          <h2 className="text-xl font-semibold">7. International transfers</h2>
          <p>
            Your data may be processed in the United States and other jurisdictions. By using our service you consent to these transfers.
          </p>

          <h2 className="text-xl font-semibold">8. Contact</h2>
          <p>
            Questions about this policy? Contact us at <a className="text-teal-300" href="mailto:support@prolight.ai">support@prolight.ai</a>.
          </p>

          <div className="mt-6 text-xs text-slate-500">
            <strong>Note:</strong> This is a template summary. For legal compliance, have your counsel review and finalize this policy.
          </div>
        </section>
      </div>
    </main>
  );
}
