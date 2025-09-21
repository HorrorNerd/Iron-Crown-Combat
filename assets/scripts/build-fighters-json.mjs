// scripts/build-fighters-json.mjs
// Node 18+ (native fetch). Run from repo root: `node scripts/build-fighters-json.mjs`

import fs from 'fs/promises';
import path from 'path';

const SHEET_ID = '1l8KRwK2D3Uyc6WTqqc6KO95nBqtfJ2WAnQSu6zyFicU';
const GID_FIGHTER_TRACKER = '1277877160';
const GID_EVENT_RESULTS   = '676906080';

// --- Helpers ---
const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;

function parseCSV(csvText) {
  // Robust-ish CSV parser with quotes
  const lines = csvText.replace(/\r/g, '').split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.trim() && rows.length === 0) continue; // skip leading blanks
    let cur = '', q = false;
    const out = [];
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const n = line[i + 1];
      if (c === '"' && n === '"') { cur += '"'; i++; continue; }
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    rows.push(out);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

const slugify = (s) =>
  s.toLowerCase()
   .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
   .replace(/[^a-z0-9]+/g,'-')
   .replace(/-+/g,'-')
   .replace(/^-|-$/g,'');

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const cleanPct = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return '';
  const n = parseFloat(String(v));
  return isNaN(n) ? '' : `${n}%`;
};

async function fetchCSV(gid) {
  const res = await fetch(csvUrl(gid), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed gid=${gid}: ${res.status}`);
  return parseCSV(await res.text());
}

// --- Build fighters.json ---
async function build() {
  console.log('Fetching Fighter Tracker…');
  const ft = await fetchCSV(GID_FIGHTER_TRACKER);

  console.log('Fetching Event Results (awards)…');
  const ev = await fetchCSV(GID_EVENT_RESULTS);

  // Build awards map from Event Results
  // Columns: Tournament, Event, Fighter A, Fighter B, Winner, Match Rating, bonus type
  const awardsByFighter = new Map();
  for (const row of ev) {
    const fighterA = row['Fighter A']?.trim();
    const fighterB = row['Fighter B']?.trim();
    const bonus    = row['bonus type']?.trim() || row['Bonus']?.trim() || '';
    if (!bonus) continue;
    [fighterA, fighterB].forEach(name => {
      if (!name) return;
      const key = name.trim();
      if (!awardsByFighter.has(key)) awardsByFighter.set(key, new Set());
      awardsByFighter.get(key).add(bonus);
    });
  }

  // Transform fighter tracker rows
  // Columns you gave: Fighter, Wins, Losses, Draws, Total Fights, Gender, Earnings, Bio, Image, Gym, Win %
  const fighters = [];
  for (const row of ft) {
    const name = row['Fighter']?.trim();
    if (!name) continue;

    const wins   = toNumber(row['Wins']);
    const losses = toNumber(row['Losses']);
    const draws  = toNumber(row['Draws']);
    const earnings = toNumber(row['Earnings']);
    const bio    = row['Bio']?.trim() || '';
    const gymRaw = row['Gym']?.trim();
    const gym    = gymRaw ? gymRaw : 'Independent';
    const winPct = cleanPct(row['Win %']);
    const slug   = slugify(name);

    // If you want to respect a custom Image column in the sheet for full pic, keep it:
    // otherwise use our convention paths.
    const imageSheet = row['Image']?.trim();
    const imgFull = imageSheet || `assets/images/fighters/${slug}.png`;
    const imgHead = `assets/images/fighters/headshots/${slug}.png`;

    const awardsSet = awardsByFighter.get(name) || new Set();
    const awards = Array.from(awardsSet).sort();

    fighters.push({
      name,
      slug,
      headshot: imgHead,
      image: imgFull,
      record: `${wins}-${losses}-${draws}`,
      wins,
      losses,
      draws,
      winPct: winPct || (wins + losses + draws > 0
        ? `${Math.round((wins / (wins + losses + draws)) * 100)}%`
        : ''),
      gym,
      earnings,
      bio,
      awards
    });
  }

  // Sort by name
  fighters.sort((a, b) => a.name.localeCompare(b.name));

  const outPath = path.join(process.cwd(), 'fighters.json');
  await fs.writeFile(outPath, JSON.stringify(fighters, null, 2), 'utf8');
  console.log(`✅ Wrote ${fighters.length} fighters → ${outPath}`);
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
