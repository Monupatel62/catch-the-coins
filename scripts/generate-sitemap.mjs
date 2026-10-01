/**
 * generate-sitemap.mjs
 * ---------------------
 * Auto-generates public/sitemap.xml by scanning public/ for HTML pages.
 *
 * - Reads each page's <link rel="canonical"> to get the correct URL.
 * - Derives <lastmod> from the file's last-modified time.
 * - Skips 404.html and any page carrying a `noindex` robots meta tag.
 * - Assigns priority / changefreq by page type.
 *
 * Run manually:  npm run sitemap
 * Runs on build: via the "prebuild" script (Netlify runs `npm run build`).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '../public');
const BLOG_DIR = join(PUBLIC_DIR, 'blog');
const SITEMAP_PATH = join(PUBLIC_DIR, 'sitemap.xml');
const BASE_URL = 'https://catchthecoins.netlify.app';

// Pages that should never appear in the sitemap (by relative path from public/).
const EXCLUDE = new Set(['404.html']);

// Skip Google Search Console verification files (googleXXXX.html) and similar.
function isVerificationFile(rel) {
  return /^google[0-9a-f]+\.html$/i.test(rel);
}

/** Pull the canonical URL from an HTML file, if present. */
function getCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/** True if the page asks robots not to index it. */
function isNoindex(html) {
  const m = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  return m ? /noindex/i.test(m[1]) : false;
}

/** ISO date (YYYY-MM-DD) of a file's last modification. */
function lastmodOf(filePath) {
  return statSync(filePath).mtime.toISOString().slice(0, 10);
}

/** Decide priority + changefreq from the URL path. */
function rankOf(urlPath) {
  if (urlPath === '/' || urlPath === '') return { priority: '1.0', changefreq: 'weekly' };
  if (urlPath === '/blog/' || urlPath === '/blog/index.html')
    return { priority: '0.9', changefreq: 'weekly' };
  if (urlPath.startsWith('/blog/')) return { priority: '0.8', changefreq: 'monthly' };
  if (urlPath === '/about.html') return { priority: '0.8', changefreq: 'monthly' };
  if (urlPath === '/privacy.html' || urlPath === '/terms.html')
    return { priority: '0.4', changefreq: 'monthly' };
  return { priority: '0.6', changefreq: 'monthly' };
}

/** Collect every indexable HTML file under public/ (top level + blog/). */
function collectHtmlFiles() {
  const files = [];
  const pushDir = (dir, relPrefix) => {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.html')) continue;
      const rel = relPrefix ? `${relPrefix}/${name}` : name;
      if (EXCLUDE.has(rel)) continue;
      if (isVerificationFile(rel)) continue;
      files.push({ abs: join(dir, name), rel });
    }
  };
  pushDir(PUBLIC_DIR, '');
  try {
    pushDir(BLOG_DIR, 'blog');
  } catch {
    /* no blog dir — fine */
  }
  return files;
}

/** Build the <url> entry for a file. */
function buildEntry({ abs, rel }) {
  const html = readFileSync(abs, 'utf-8');
  if (isNoindex(html)) return null;

  // Prefer the file's own canonical; otherwise derive from its path.
  let loc = getCanonical(html);
  if (!loc) {
    // index.html -> directory URL (/, /blog/)
    let urlPath = '/' + rel;
    urlPath = urlPath.replace(/index\.html$/, '');
    loc = BASE_URL + urlPath;
  }

  const urlPath = loc.replace(BASE_URL, '') || '/';
  const { priority, changefreq } = rankOf(urlPath);
  const lastmod = lastmodOf(abs);

  // The homepage can carry an image entry.
  const imageBlock =
    urlPath === '/'
      ? `
    <image:image>
      <image:loc>${BASE_URL}/og-image.png</image:loc>
      <image:title>Catch the Coin — Free Online Arcade Game</image:title>
      <image:caption>Move a basket to catch falling gold coins and beat your high score. Free browser arcade game, no download required.</image:caption>
    </image:image>`
      : '';

  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageBlock}
  </url>`;
}

/** Sort: homepage first, then blog index, then by priority desc, then path. */
function sortEntries(entries) {
  const weight = (loc) => {
    const p = loc.replace(BASE_URL, '') || '/';
    if (p === '/') return 0;
    if (p === '/blog/') return 1;
    if (p === '/about.html') return 2;
    if (p.startsWith('/blog/')) return 3;
    return 4;
  };
  return entries.sort((a, b) => {
    const wa = weight(a.loc);
    const wb = weight(b.loc);
    if (wa !== wb) return wa - wb;
    return a.loc.localeCompare(b.loc);
  });
}

const ROOT_INDEX = resolve(__dirname, '../index.html');

/** Build the homepage entry from the root index.html (built by Vite, not in public/). */
function buildHomeEntry() {
  let lastmod;
  try {
    lastmod = lastmodOf(ROOT_INDEX);
  } catch {
    lastmod = new Date().toISOString().slice(0, 10);
  }
  return `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${BASE_URL}/og-image.png</image:loc>
      <image:title>Catch the Coin \u2014 Free Online Arcade Game</image:title>
      <image:caption>Move a basket to catch falling gold coins and beat your high score. Free browser arcade game, no download required.</image:caption>
    </image:image>
  </url>`;
}

function generate() {
  const files = collectHtmlFiles();
  const entries = [];
  // Homepage is always first and comes from the project-root index.html.
  entries.push({ loc: `${BASE_URL}/`, xml: buildHomeEntry() });
  for (const f of files) {
    const xml = buildEntry(f);
    if (!xml) continue;
    const loc = xml.match(/<loc>([^<]+)<\/loc>/)[1];
    entries.push({ loc, xml });
  }
  sortEntries(entries);

  const body = entries.map((e) => e.xml).join('\n\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${body}
</urlset>
`;

  writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
  console.log(`sitemap.xml generated with ${entries.length} URLs at ${SITEMAP_PATH}`);
}

generate();
