import { useLayoutEffect } from 'react';

const SITE_URL = 'https://www.indiatradeoverseas.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/Company_logo.png`;

function upsertMetaByAttr(attr, value, content) {
  let el = document.head.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets document.title and upserts per-page SEO/social meta tags.
 * Runs in useLayoutEffect so it always commits before AppLayout's
 * virtual_page_view effect (App.jsx) reads document.title on route change.
 */
export default function useDocumentMeta({ title, description, canonicalPath, ogImage }) {
  useLayoutEffect(() => {
    if (title) document.title = title;

    if (description) {
      upsertMetaByAttr('name', 'description', description);
      upsertMetaByAttr('property', 'og:description', description);
      upsertMetaByAttr('name', 'twitter:description', description);
    }

    if (title) {
      upsertMetaByAttr('property', 'og:title', title);
      upsertMetaByAttr('name', 'twitter:title', title);
    }

    const image = ogImage || DEFAULT_OG_IMAGE;
    upsertMetaByAttr('property', 'og:image', image);
    upsertMetaByAttr('name', 'twitter:image', image);

    if (canonicalPath) {
      const canonicalUrl = `${SITE_URL}${canonicalPath}`;
      upsertMetaByAttr('property', 'og:url', canonicalUrl);
      upsertCanonicalLink(canonicalUrl);
    }
  }, [title, description, canonicalPath, ogImage]);
}
