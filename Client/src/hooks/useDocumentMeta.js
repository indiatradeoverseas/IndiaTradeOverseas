import { useLayoutEffect } from 'react';

const SITE_URL = 'https://www.indiatradeoverseas.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/web_icon_1.jpeg`;

function upsertMetaByAttr(attr, value, content) {
  if (!content) return;

  let el = document.head.querySelector(
    `meta[${attr}="${value}"]`
  );

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }

  el.setAttribute('content', content);
}

function upsertCanonicalLink(href) {
  if (!href) return;

  let el = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }

  el.setAttribute('href', href);
}

function buildCanonicalUrl(canonicalPath) {
  if (!canonicalPath) return null;

  // Allow an already-qualified canonical URL.
  if (/^https?:\/\//i.test(canonicalPath)) {
    return canonicalPath;
  }

  const normalizedPath = canonicalPath.startsWith('/')
    ? canonicalPath
    : `/${canonicalPath}`;

  return `${SITE_URL}${normalizedPath}`;
}

/**
 * Updates page-level SEO and social metadata.
 *
 * Handles:
 * - document.title
 * - meta description
 * - canonical URL
 * - Open Graph metadata
 * - Twitter/X metadata
 * - robots directive
 *
 * useLayoutEffect is intentional so metadata is committed
 * before AppLayout's virtual_page_view tracking reads
 * document.title after route changes.
 */
export default function useDocumentMeta({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = 'website',
  robots = 'index, follow'
}) {
  useLayoutEffect(() => {
    /*
     * =========================================================
     * TITLE
     * =========================================================
     */

    if (title) {
      document.title = title;
    }

    /*
     * =========================================================
     * DESCRIPTION
     * =========================================================
     */

    if (description) {
      upsertMetaByAttr(
        'name',
        'description',
        description
      );

      upsertMetaByAttr(
        'property',
        'og:description',
        description
      );

      upsertMetaByAttr(
        'name',
        'twitter:description',
        description
      );
    }

    /*
     * =========================================================
     * OPEN GRAPH TITLE
     * =========================================================
     */

    if (title) {
      upsertMetaByAttr(
        'property',
        'og:title',
        title
      );

      upsertMetaByAttr(
        'name',
        'twitter:title',
        title
      );
    }

    /*
     * =========================================================
     * OPEN GRAPH TYPE
     * =========================================================
     */

    upsertMetaByAttr(
      'property',
      'og:type',
      ogType
    );

    /*
     * =========================================================
     * SOCIAL IMAGE
     * =========================================================
     */

    const image = ogImage || DEFAULT_OG_IMAGE;

    upsertMetaByAttr(
      'property',
      'og:image',
      image
    );

    upsertMetaByAttr(
      'name',
      'twitter:image',
      image
    );

    /*
     * =========================================================
     * CANONICAL + OG URL + TWITTER URL
     * =========================================================
     */

    const canonicalUrl =
      buildCanonicalUrl(canonicalPath);

    if (canonicalUrl) {
      upsertMetaByAttr(
        'property',
        'og:url',
        canonicalUrl
      );

      upsertMetaByAttr(
        'name',
        'twitter:url',
        canonicalUrl
      );

      upsertCanonicalLink(canonicalUrl);
    }

    /*
     * =========================================================
     * TWITTER / X CARD
     * =========================================================
     */

    upsertMetaByAttr(
      'name',
      'twitter:card',
      'summary_large_image'
    );

    /*
     * =========================================================
     * ROBOTS
     * =========================================================
     *
     * Default:
     * index, follow
     *
     * For pages that should not appear in search results,
     * call the hook with:
     *
     * robots: 'noindex, nofollow'
     * =========================================================
     */

    upsertMetaByAttr(
      'name',
      'robots',
      robots
    );
  }, [
    title,
    description,
    canonicalPath,
    ogImage,
    ogType,
    robots
  ]);
}