import React from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

type SEOProps = {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
};

export const SEO: React.FC<SEOProps> = ({ title, description, url, image, type = "website" }) => {
  const siteName = "ProLight AI";
  const canonical = url || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <HelmetProvider>
      <Helmet>
        <title>{title} · {siteName}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content={type} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {image && <meta property="og:image" content={image} />}
        <meta property="og:site_name" content={siteName} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {image && <meta name="twitter:image" content={image} />}
        <link rel="canonical" href={canonical} />
      </Helmet>
    </HelmetProvider>
  );
};

