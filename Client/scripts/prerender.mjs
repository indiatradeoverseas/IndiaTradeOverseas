// Runs after `vite build`. Serves the built dist/ locally, visits each
// known public marketing route in a real headless browser, and writes the
// fully-rendered DOM to dist/<route>/index.html. Vercel serves any static
// file that matches a request path before falling back to the SPA rewrite
// in vercel.json (the same mechanism that already lets robots.txt and
// sitemap.xml be served as raw files) - so these become real static HTML
// for crawlers and first paint, with zero vercel.json changes needed.
//
// CRM/login/marketplace-interaction routes are deliberately NOT in this
// list - they need no SEO and stay pure client-rendered, same as today.
//
// Usage: node scripts/prerender.mjs (run after `vite build`)
//
// Browser launch is environment-aware: full `puppeteer` bundles its own
// Chromium and works out of the box for local dev, but Vercel's build
// container is missing system libraries (libnspr4 etc.) that bundled
// Chromium needs, so on Vercel this uses `puppeteer-core` with
// `@sparticuz/chromium` - a Chromium build packaged specifically to run in
// serverless/minimal Linux build environments like Vercel's.
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const PORT = 4173;

const ROUTES = [
  '/',
  '/products',
  '/about',
  '/contact',
  '/careers',
  '/quote-request',
  '/prakriti',
  '/prakriti/rice',
  '/stone'
];

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4'
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = join(DIST, decodeURIComponent(urlPath));
    const isServeableFile = existsSync(filePath) && statSync(filePath).isFile();
    if (!isServeableFile) {
      filePath = join(DIST, 'index.html');
    }
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

function outPathFor(route) {
  if (route === '/') return join(DIST, 'index.html');
  return join(DIST, route.replace(/^\//, ''), 'index.html');
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const [{ default: puppeteerCore }, { default: chromium }] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium')
    ]);
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
  }
  const { default: puppeteer } = await import('puppeteer');
  return puppeteer.launch({ headless: true });
}

async function prerenderRoute(browser, route) {
  const page = await browser.newPage();
  // Don't record fake pageviews / fire real pixels for the build machine's
  // crawl, and don't waste time waiting on third-party trackers to settle.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('googletagmanager.com') || url.includes('google-analytics.com') || url.includes('checkout.razorpay.com')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
  // networkidle0 only tracks network activity - framer-motion entrance
  // animations (fade/slide-in on mount) are still mid-transition at that
  // point, which would otherwise bake opacity:0 / transformed elements
  // into the static HTML. Give them time to settle before capturing.
  //
  // Note: main.jsx always does a plain createRoot client render regardless
  // (not hydrateRoot) specifically because of this - the settled DOM here
  // is in a different state than framer-motion's declared `initial` prop,
  // which would mismatch on hydration. This markup is for crawlers/first
  // paint only, not something the client is expected to attach onto.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const html = await page.content();
  await page.close();

  const outPath = outPathFor(route);
  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, html);
  return outPath;
}

async function run() {
  if (!existsSync(DIST)) {
    console.error('dist/ not found - run `vite build` first.');
    process.exit(1);
  }

  const server = await startServer();
  const browser = await launchBrowser();

  try {
    for (const route of ROUTES) {
      const outPath = await prerenderRoute(browser, route);
      console.log(`Prerendered ${route} -> ${outPath.replace(DIST, 'dist')}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nDone: ${ROUTES.length} route(s) prerendered.`);
}

// A prerender failure (browser launch, a route timing out, etc.) must never
// take down the whole deploy - the site is fully functional as plain CSR
// without it (that's the state it was in before this script existed). Log
// it loudly so it's visible in the Vercel build log, but always exit 0.
run().catch((error) => {
  console.error('Prerendering failed - continuing deploy WITHOUT prerendered pages:');
  console.error(error);
  process.exitCode = 0;
});
