// src/pages/PaymentPage.tsx
import React, { useState } from "react";
import api from "../api/axios";
import StubPaymentProvider from "../components/StubPaymentProvider";
import { motion } from "framer-motion";

export default function PaymentPage() {
  const [amount, setAmount] = useState(49);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleToken(token: string) {
    // Simulate calling backend to create payment
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post("/payments/stub-charge", { token, amount });
      setMessage("Payment successful: " + res.data.id);
    } catch (err: any) {
      setMessage("Payment failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen p-8 bg-gradient-to-br from-[#071018] to-[#06121a] text-slate-100">
      <div className="max-w-4xl mx-auto bg-[#0b0f14] rounded-2xl p-8 shadow-lg border border-slate-800">
        <h1 className="text-2xl font-bold mb-4">Payment</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-400">Amount (USD)</label>
            <input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))} className="w-full p-3 rounded bg-[#061018] border border-slate-700 mt-2" />
            <p className="text-sm text-slate-400 mt-2">Use the test card in the stub provider to simulate a payment.</p>
          </div>

          <div>
            <div className="mb-2 text-sm">Use Stub Payment Provider</div>
            <StubPaymentProvider amount={amount} onToken={handleToken} disabled={busy} />
            {busy && <div className="mt-3 text-sm text-slate-400">Processing…</div>}
            {message && <div className="mt-3 text-sm">{message}</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
