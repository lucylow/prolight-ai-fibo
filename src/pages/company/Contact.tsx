import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with backend API
    window.location.href = `mailto:hello@prolight.ai?subject=Contact from ${formData.name}&body=${encodeURIComponent(formData.message)}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <p className="text-gray-600 mb-12">
        Questions about ProLight AI, partnerships, or enterprise access?
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <input
          type="text"
          className="w-full border rounded-lg p-3"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          className="w-full border rounded-lg p-3"
          placeholder="Email address"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <textarea
          className="w-full border rounded-lg p-3"
          rows={5}
          placeholder="How can we help?"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
        />
        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Send Message
        </button>
      </form>

      <div className="mt-12 text-sm text-gray-500">
        Or email us directly at{" "}
        <a href="mailto:hello@prolight.ai" className="font-medium text-teal-600 hover:text-teal-700">
          hello@prolight.ai
        </a>
      </div>
    </div>
  );
}
