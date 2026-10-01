import { useLayoutEffect } from 'react';

const SITE_URL = 'https://www.indiatradeoverseas.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/web_icon_1.jpeg`;

const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/* =========================================================
   META HELPERS
========================================================= */

function upsertMetaByAttr(attr, value, content) {
  if (!attr || !value || !content) {
    return;
  }

  let element = document.head.querySelector(
    `meta[${attr}="${value}"]`
  );

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertCanonicalLink(href) {
  if (!href) {
    return;
  }

  let element = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

/* =========================================================
   URL HELPERS
========================================================= */

function normalizePath(path) {
  if (!path || path === '/') {
    return '/';
  }

  const cleanPath = path
    .split('?')[0]
    .split('#')[0];

  const withLeadingSlash =
    cleanPath.startsWith('/')
      ? cleanPath
      : `/${cleanPath}`;

  /*
   * Canonical convention:
   *
   * Homepage:
   * https://www.indiatradeoverseas.com/
   *
   * Internal pages:
   * https://www.indiatradeoverseas.com/coal
   *
   * No trailing slash on internal pages.
   */
  return withLeadingSlash.replace(/\/+$/, '');
}

function buildCanonicalUrl(canonicalPath) {
  /*
   * If the page does not explicitly provide canonicalPath,
   * use the current route rather than leaving a stale canonical
   * from the previous SPA page.
   */
  const target =
    canonicalPath ||
    window.location.pathname ||
    '/';

  if (/^https?:\/\//i.test(target)) {
    try {
      const url = new URL(target);

      url.search = '';
      url.hash = '';

      if (url.pathname !== '/') {
        url.pathname =
          url.pathname.replace(/\/+$/, '');
      }

      return url.toString();
    } catch {
      return `${SITE_URL}/`;
    }
  }

  const normalizedPath =
    normalizePath(target);

  return normalizedPath === '/'
    ? `${SITE_URL}/`
    : `${SITE_URL}${normalizedPath}`;
}

function buildAbsoluteAssetUrl(assetUrl) {
  if (!assetUrl) {
    return DEFAULT_OG_IMAGE;
  }

  if (
    /^https?:\/\//i.test(assetUrl)
  ) {
    return assetUrl;
  }

  const normalizedAssetPath =
    assetUrl.startsWith('/')
      ? assetUrl
      : `/${assetUrl}`;

  return `${SITE_URL}${normalizedAssetPath}`;
}

/* =========================================================
   DOCUMENT META HOOK
========================================================= */

/**
 * India Trade Overseas — page-level SEO metadata.
 *
 * Handles:
 * - document title
 * - meta description
 * - canonical URL
 * - Open Graph
 * - Twitter / X
 * - robots directives
 *
 * Public indexed page example:
 *
 * useDocumentMeta({
 *   title: 'Coal Supplier in India | India Trade Overseas',
 *   description: '...',
 *   canonicalPath: '/coal'
 * });
 *
 * Private / transactional page example:
 *
 * useDocumentMeta({
 *   title: 'Coal Pricing | India Trade Overseas',
 *   description: '...',
 *   canonicalPath: '/coal/pricing',
 *   robots: 'noindex, nofollow'
 * });
 */
export default function useDocumentMeta({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = 'website',
  robots = DEFAULT_ROBOTS
}) {
  useLayoutEffect(() => {
    /* =====================================================
       TITLE
    ===================================================== */

    if (title) {
      document.title = title;
    }

    /* =====================================================
       DESCRIPTION
    ===================================================== */

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

    /* =====================================================
       TITLE — SOCIAL
    ===================================================== */

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

    /* =====================================================
       OPEN GRAPH
    ===================================================== */

    upsertMetaByAttr(
      'property',
      'og:type',
      ogType
    );

    upsertMetaByAttr(
      'property',
      'og:site_name',
      'India Trade Overseas'
    );

    upsertMetaByAttr(
      'property',
      'og:locale',
      'en_IN'
    );

    /* =====================================================
       SOCIAL IMAGE
    ===================================================== */

    const socialImage =
      buildAbsoluteAssetUrl(ogImage);

    upsertMetaByAttr(
      'property',
      'og:image',
      socialImage
    );

    upsertMetaByAttr(
      'name',
      'twitter:image',
      socialImage
    );

    /* =====================================================
       CANONICAL URL
    ===================================================== */

    const canonicalUrl =
      buildCanonicalUrl(canonicalPath);

    upsertCanonicalLink(
      canonicalUrl
    );

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

    /* =====================================================
       TWITTER / X
    ===================================================== */

    upsertMetaByAttr(
      'name',
      'twitter:card',
      'summary_large_image'
    );

    /* =====================================================
       ROBOTS
    ===================================================== */

    const robotsDirective =
      robots || DEFAULT_ROBOTS;

    upsertMetaByAttr(
      'name',
      'robots',
      robotsDirective
    );

    /*
     * Keep Google-specific crawler directives aligned
     * with the general robots directive.
     */
    upsertMetaByAttr(
      'name',
      'googlebot',
      robotsDirective
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