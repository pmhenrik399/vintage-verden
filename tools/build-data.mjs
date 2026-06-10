// Konverterer rå scrape-data (ads.json fra nettleseren) til data/products.json for nettsiden.
// Bruk: node tools/build-data.mjs <sti-til-ads.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src) { console.error('Bruk: node build-data.mjs <ads.json>'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const ads = Array.isArray(raw) ? raw : raw.results;

function catName(c) {
  if (!c) return 'Annet';
  if (typeof c === 'string') return c;
  // Hierarkisk: {value:"Bukser", parent:{value:"Dameklær", parent:{value:"Klær, ..."}}}
  const parts = [];
  let node = c;
  while (node) { parts.unshift(node.value || node.name || node.label); node = node.parent; }
  return parts.filter(Boolean).join(' / ') || 'Annet';
}

function condition(extras) {
  if (!Array.isArray(extras)) return null;
  for (const e of extras) {
    const lbl = (e && (e.label || e.name) || '').toLowerCase();
    if (lbl.includes('tilstand') || lbl.includes('condition')) return e.value || e.text || null;
  }
  return null;
}

const products = ads
  .filter(a => a && a.id && a.title)
  .map(a => ({
    id: a.id,
    title: a.title,
    desc: (a.description || '').trim(),
    price: typeof a.price === 'number' ? a.price : (a.price && a.price.amount) || null,
    cat: catName(a.category),
    cond: condition(a.extras),
    updated: a.updated || null,
    imgs: (a.images || []).filter(Boolean),
  }))
  .sort((x, y) => String(y.updated).localeCompare(String(x.updated)));

// dedup på id
const seen = new Set();
const unique = products.filter(p => !seen.has(p.id) && seen.add(p.id));

const outDir = path.join(here, '..', 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(unique), 'utf8');

const cats = {};
for (const p of unique) cats[p.cat] = (cats[p.cat] || 0) + 1;
console.log(`products.json: ${unique.length} produkter`);
console.log('Kategorier:', Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,30));
