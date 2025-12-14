const posts = [
  {
    title: "Why Deterministic AI Matters for Creative Teams",
    excerpt: "Prompt randomness breaks production workflows. Structured generation fixes it.",
    date: "2025-01-12"
  },
  {
    title: "From Studio Lighting to FIBO JSON",
    excerpt: "How we mapped professional lighting theory into AI-native schemas.",
    date: "2024-12-02"
  }
];

export default function BlogPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
      <h1 className="text-4xl font-bold mb-12">Blog</h1>

      <div className="space-y-8">
        {posts.map(post => (
          <article
            key={post.title}
            className="border rounded-xl p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-gray-600 mt-2">{post.excerpt}</p>
            <p className="text-sm text-gray-400 mt-4">{post.date}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
