// src/pages/TermsOfService.tsx
import React from "react";

const EFFECTIVE_DATE = "2025-01-01";
const VERSION = "1.0";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-[#071018] text-slate-100 py-12 px-6">
      <div className="max-w-5xl mx-auto bg-[#0b0f14] rounded-2xl p-8 shadow-lg border border-slate-700">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <div className="text-sm text-slate-400 mt-1">
            Effective date: <strong>{EFFECTIVE_DATE}</strong> • Version: {VERSION}
          </div>
        </header>

        <section className="space-y-6 text-slate-300 leading-relaxed">
          <h2 className="text-xl font-semibold">1. Acceptance</h2>
          <p>
            These Terms of Service ("Terms") govern your access to and use of the ProLight AI platform. By using the service, you agree to these Terms.
          </p>

          <h2 className="text-xl font-semibold">2. Accounts & registration</h2>
          <p>
            You must provide accurate information, secure your credentials, and maintain access to a valid payment method if you have a paid account.
          </p>

          <h2 className="text-xl font-semibold">3. Use of the service</h2>
          <p>
            ProLight AI provides tools for image/video editing and generation. You retain ownership of content you upload, but grant us a license to provide the service (see full license terms).
          </p>

          <h2 className="text-xl font-semibold">4. Prohibited conduct</h2>
          <ul className="list-disc pl-6">
            <li>Illegal activity</li>
            <li>Uploading content that infringes third-party rights</li>
            <li>Using the service to generate disallowed material</li>
          </ul>

          <h2 className="text-xl font-semibold">5. Fees & billing</h2>
          <p>
            Paid features are billed through Stripe. Refunds, cancellations, and subscription management are governed by our billing policies.
          </p>

          <h2 className="text-xl font-semibold">6. Termination</h2>
          <p>
            We may suspend or terminate accounts for violations or suspicious activity. You may cancel subscriptions per the billing terms.
          </p>

          <h2 className="text-xl font-semibold">7. Disclaimers & limitation of liability</h2>
          <p>
            The service is provided "as is". To the maximum extent permitted by law, our liability is limited as set forth in this section.
          </p>

          <h2 className="text-xl font-semibold">8. Governing law</h2>
          <p>
            These Terms are governed by the laws of [Jurisdiction]. Disputes shall be resolved in courts of that jurisdiction unless otherwise agreed.
          </p>

          <h2 className="text-xl font-semibold">9. Changes</h2>
          <p>
            We may update these Terms; we will notify users where required by law and publish version history on this page.
          </p>

          <div className="mt-6 text-xs text-slate-500">
            <strong>Legal note:</strong> These terms are a template. Work with counsel to finalize binding Terms of Service.
          </div>
        </section>
      </div>
    </main>
  );
}
