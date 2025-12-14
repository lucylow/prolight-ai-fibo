import React, { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";

// Vite: import all .mdx files from content/posts
interface MDXModule {
  default?: React.ComponentType;
  frontmatter?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const mdxFiles = import.meta.glob("../../content/posts/*.mdx", { eager: true }) as Record<string, MDXModule>;

type PostMeta = { 
  title: string; 
  date: string; 
  description?: string; 
  slug: string;
  mod: { frontmatter?: Record<string, unknown>; meta?: Record<string, unknown>; default?: React.ComponentType };
};

export default function BlogPage() {
  const [posts, setPosts] = useState<PostMeta[]>([]);

  useEffect(() => {
    const list = Object.entries(mdxFiles).map(([path, mod]) => {
      const meta = mod.frontmatter || mod.meta || {};
      const slug = path.split("/").pop()?.replace(/\.mdx$/, "") || "";
      return { 
        title: meta.title || slug, 
        date: meta.date || "1970-01-01", 
        description: meta.description || "", 
        slug, 
        mod 
      };
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
    setPosts(list);
  }, []);

  return (
    <>
      <SEO title="Blog" description="ProLight AI engineering & product updates" />
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Blog</h1>
        <div className="grid gap-6">
          {posts.map(post => (
            <article key={post.slug} className="p-6 border rounded-lg bg-card">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-sm text-muted-foreground">{post.date}</p>
              <p className="mt-3 text-muted-foreground">{post.description}</p>
              <Link 
                to={`/company/blog/${post.slug}`} 
                className="mt-3 inline-block text-primary hover:text-primary/80"
              >
                Read →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
