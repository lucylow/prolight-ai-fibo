import React, { Suspense } from "react";
import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";

interface MDXModule {
  default?: React.ComponentType;
  frontmatter?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const mdxFiles = import.meta.glob("../../content/posts/*.mdx", { eager: true }) as Record<string, MDXModule>;

export default function PostView() {
  const { slug } = useParams<{ slug: string }>();
  const key = Object.keys(mdxFiles).find(k => k.includes(`${slug}.mdx`));
  
  if (!key) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="p-6">Post not found</div>
      </div>
    );
  }

  const mod = mdxFiles[key];
  const Component = mod.default;
  const frontmatter = mod.frontmatter || mod.meta || {};

  return (
    <>
      <SEO 
        title={frontmatter.title || slug} 
        description={frontmatter.description || ""} 
      />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{frontmatter.date}</p>

        <article className="prose prose-lg mt-6 dark:prose-invert max-w-none">
          <Suspense fallback={<div>Loading post…</div>}>
            <Component />
          </Suspense>
        </article>
      </main>
    </>
  );
}
