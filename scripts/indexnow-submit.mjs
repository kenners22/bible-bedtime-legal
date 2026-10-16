import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const host = 'biblebedtime.uk';
const site = `https://${host}`;

const keyFile = readdirSync(join(root, 'public')).find((name) =>
  /^[0-9a-f]{32}\.txt$/.test(name),
);
if (!keyFile) {
  console.error('No IndexNow key file in public/');
  process.exit(1);
}

const key = keyFile.slice(0, -'.txt'.length);
const keyBody = readFileSync(join(root, 'public', keyFile), 'utf8');
if (keyBody !== key) {
  console.error('IndexNow key file contents do not match its name');
  process.exit(1);
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

const dist = join(root, 'dist');
const indexXml = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
const pageUrls = [];

for (const loc of locs(indexXml)) {
  const name = new URL(loc).pathname.split('/').filter(Boolean).pop();
  if (name !== 'sitemap-0.xml') continue;
  pageUrls.push(...locs(readFileSync(join(dist, 'sitemap-0.xml'), 'utf8')));
}

const urlList = [...new Set(pageUrls)];
if (urlList.length === 0) {
  console.error('No URLs found in dist/sitemap-0.xml');
  process.exit(1);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `${site}/${key}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`IndexNow submit failed: ${response.status} ${body}`);
  process.exit(1);
}

console.log(`Submitted ${urlList.length} URLs to IndexNow (${response.status})`);
