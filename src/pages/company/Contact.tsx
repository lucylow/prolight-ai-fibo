import React, { useState } from "react";
import axios from "axios";
import { SEO } from "@/components/SEO";
import { toast } from "react-toastify";
import RecaptchaWrapper from "@/components/RecaptchaWrapper";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/contact", {
        ...form,
        recaptchaToken
      });
      toast.success("Message sent — we'll reply soon.");
      setForm({ name: "", email: "", message: "" });
      setRecaptchaToken(null);
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to send message.");
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <>
      <SEO title="Contact" description="Get in touch with ProLight AI" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-6">Contact</h1>
        <p className="text-muted-foreground mb-8">
          Questions about ProLight AI, partnerships, or enterprise access?
        </p>
        
        <form onSubmit={submit} className="space-y-4">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className="w-full border rounded-lg p-3 bg-background"
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="w-full border rounded-lg p-3 bg-background"
            required
          />
          <textarea
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            rows={6}
            placeholder="How can we help?"
            className="w-full border rounded-lg p-3 bg-background"
            required
          />
          
          {SITE_KEY && (
            <div className="py-2">
              <RecaptchaWrapper 
                siteKey={SITE_KEY} 
                onVerify={(token) => setRecaptchaToken(token)} 
              />
            </div>
          )}
          
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>

        <div className="mt-12 text-sm text-muted-foreground">
          Or email us directly at{" "}
          <a href="mailto:hello@prolight.ai" className="font-medium text-primary hover:text-primary/80">
            hello@prolight.ai
          </a>
        </div>
      </div>
    </>
  );
}
