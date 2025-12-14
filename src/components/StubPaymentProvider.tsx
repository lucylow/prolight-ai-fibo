// src/components/StubPaymentProvider.tsx
import React, { useState } from "react";

export default function StubPaymentProvider({ amount, onToken, disabled }: { amount: number; onToken: (token: string) => void; disabled?: boolean }) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [name, setName] = useState("");
  const [cvc, setCvc] = useState("123");
  const [exp, setExp] = useState("12/34");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    // quick validation
    if (!name) return alert("Enter name");
    // produce fake token
    const token = `stub_tok_${Math.random().toString(36).slice(2, 9)}`;
    setTimeout(()=> onToken(token), 600); // simulate network
  }

  return (
    <form onSubmit={submit} className="bg-[#061018] p-4 rounded space-y-3">
      <label className="text-xs text-slate-400">Cardholder</label>
      <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full p-2 rounded bg-[#05080a] border border-slate-700" placeholder="Jane Doe" />

      <label className="text-xs text-slate-400">Card</label>
      <input value={card} onChange={(e)=>setCard(e.target.value)} className="w-full p-2 rounded bg-[#05080a] border border-slate-700" />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-400">Exp</label>
          <input value={exp} onChange={(e)=>setExp(e.target.value)} className="w-full p-2 rounded bg-[#05080a] border border-slate-700" />
        </div>
        <div style={{width: 110}}>
          <label className="text-xs text-slate-400">CVC</label>
          <input value={cvc} onChange={(e)=>setCvc(e.target.value)} className="w-full p-2 rounded bg-[#05080a] border border-slate-700" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">Pay ${amount.toFixed(2)}</div>
        <button type="submit" disabled={disabled} className="px-4 py-2 bg-teal-500 text-black rounded">Pay</button>
      </div>
    </form>
  );
}
