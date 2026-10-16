import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const publicDir = join(root, 'public');
const htmlFiles = [join(root, 'index.html')];

function collect(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === '.versions' || name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full);
    else if (name.endsWith('.html') && !['404.html'].includes(name)) htmlFiles.push(full);
  }
}

collect(publicDir);
const errors = [];
const warnings = [];
const titles = new Map();
const canonicals = new Map();

function value(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? '';
}

for (const file of [...new Set(htmlFiles)]) {
  const html = readFileSync(file, 'utf8');
  const name = relative(root, file).replaceAll('\\\\', '/');
  const title = value(html, /<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i);
  const description = value(html, /<meta\\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || value(html, /<meta\\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const canonical = value(html, /<link\\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || value(html, /<link\\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);

  for (const [label, content] of [['title', title], ['meta description', description], ['canonical URL', canonical]]) {
    if (!content) errors.push(`Missing ${label}: ${name}`);
  }

  if (title) {
    const normalized = title.replace(/\\s+/g, ' ').toLowerCase();
    if (titles.has(normalized)) warnings.push(`Duplicate title: ${name} and ${titles.get(normalized)}`);
    else titles.set(normalized, name);
    if (title.length < 20 || title.length > 70) warnings.push(`Title length ${title.length} (review): ${name}`);
  }
  if (description && (description.length < 70 || description.length > 170)) {
    warnings.push(`Description length ${description.length} (review): ${name}`);
  }
  if (canonical) {
    if (!/^https?:\\/\\//i.test(canonical)) errors.push(`Canonical must be absolute: ${name}`);
    if (canonicals.has(canonical)) warnings.push(`Duplicate canonical: ${name} and ${canonicals.get(canonical)}`);
    else canonicals.set(canonical, name);
  }

  for (const [label, pattern] of [
    ['Open Graph title', /property=["']og:title["']/i],
    ['Open Graph description', /property=["']og:description["']/i],
    ['Open Graph image', /property=["']og:image["']/i],
    ['Twitter card', /name=["']twitter:card["']/i],
    ['Twitter image', /name=["']twitter:image["']/i],
  ]) {
    if (!pattern.test(html)) warnings.push(`Missing ${label}: ${name}`);
  }
}

const imagePath = join(publicDir, 'og-image.png');
if (!existsSync(imagePath)) errors.push('Missing public/og-image.png (social preview image)');
if (!existsSync(join(publicDir, 'robots.txt'))) errors.push('Missing public/robots.txt');
if (!existsSync(join(publicDir, 'sitemap.xml'))) warnings.push('Missing public/sitemap.xml (generated during build)');

console.log(`SEO audit: ${new Set(htmlFiles).size} HTML pages checked`);
for (const item of errors) console.error(`ERROR  ${item}`);
for (const item of warnings) console.warn(`WARN   ${item}`);
console.log(`Result: ${errors.length} error(s), ${warnings.length} warning(s)`);
if (errors.length) process.exitCode = 1;
