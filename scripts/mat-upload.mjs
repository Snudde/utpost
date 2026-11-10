#!/usr/bin/env node
// M7: mätskriptet för skuld 8 – "bilduppladdning skalar om bilder i request-tråden, timeouts vid last".
//
// Skickar N samtidiga POST /api/photos och frågar under tiden GET /api/health var 100:e ms.
// Health är ett `select 1` + en ping till Mongo – det ska ta några millisekunder. Tar det sekunder
// under uppladdningen är det inte health som är långsam, det är tråden som är upptagen.
//
//   node scripts/mat-upload.mjs                                   # standard: localhost:4000, N=10, 4000x3000
//   node scripts/mat-upload.mjs --api http://localhost:4000 --n 10 --size 4000x3000
//   npm run mat -- --n 20                                         # samma sak via rotens script
//
// Kör det FÖRE (bildkoden i API:et) och EFTER (bildkoden i funktionen) och skriv in båda
// tabellerna i docs/decisions/serverless.md. Bara Node 22 och fetch – inga beroenden.

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const api = flag('api', 'http://localhost:4000').replace(/\/$/, '');
const n = Number(flag('n', '10'));
const [width, height] = flag('size', '4000x3000').split('x').map(Number);
const tourId = Number(flag('tour', '1'));
const intervalMs = Number(flag('interval', '100'));

if (!Number.isInteger(n) || n < 1 || !width || !height) {
  console.error('Användning: node scripts/mat-upload.mjs --api http://localhost:4000 --n 10 --size 4000x3000');
  process.exit(1);
}

const percentile = (values, p) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};
const ms = (v) => (Number.isFinite(v) ? `${Math.round(v)} ms` : '–');

// Först: svarar API:et alls? Annars mäter vi bara anslutningsfel.
try {
  const res = await fetch(`${api}/api/health`);
  if (!res.ok) throw new Error(`svarade ${res.status}`);
} catch (err) {
  console.error(`API:et på ${api} svarar inte (${err.message}). Kör npm run dev:api först.`);
  process.exit(1);
}

console.log(`Mäter ${api}: ${n} samtidiga uppladdningar à ${width}x${height}, health var ${intervalMs}:e ms …`);

// Health samplas med en klocka som inte bryr sig om föregående svar – annars skulle ett blockerat
// API ge färre mätpunkter, och det är just de långa väntetiderna vi vill se.
const health = [];
const pending = [];
const sampler = setInterval(() => {
  const t0 = performance.now();
  pending.push(
    fetch(`${api}/api/health`)
      .then((res) => res.text())
      .then(() => health.push(performance.now() - t0))
      .catch(() => health.push(NaN)),
  );
}, intervalMs);

const started = performance.now();
const uploads = await Promise.all(
  Array.from({ length: n }, async (_, i) => {
    const t0 = performance.now();
    try {
      const res = await fetch(`${api}/api/photos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tourId, filename: `mat-${i + 1}.jpg`, width, height }),
      });
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, ms: performance.now() - t0, body };
    } catch (err) {
      return { ok: false, status: err.message, ms: performance.now() - t0, body: {} };
    }
  }),
);
const totalMs = performance.now() - started;
clearInterval(sampler);
await Promise.all(pending);

const ok = uploads.filter((u) => u.ok);
const failed = uploads.filter((u) => !u.ok);
const uploadMs = uploads.map((u) => u.ms);
const healthMs = health.filter(Number.isFinite);
const processing = ok.map((u) => u.body.processingMs).filter(Number.isFinite);
const apiMs = ok.map((u) => u.body.apiMs).filter(Number.isFinite);
const coldStarts = ok.filter((u) => u.body.coldStart === true).length;

const rows = [
  ['Uppladdning (POST /api/photos)', ms(percentile(uploadMs, 50)), ms(Math.max(...uploadMs)), `${ok.length}/${n} ok`],
  ['Health (GET /api/health)', ms(percentile(healthMs, 50)), ms(Math.max(...healthMs)), `${healthMs.length} anrop`],
  ['processingMs (bildarbetet)', ms(percentile(processing, 50)), ms(Math.max(...processing)), processing.length ? '' : 'saknas i svaret'],
  ['apiMs (API:ets totala tid)', ms(percentile(apiMs, 50)), ms(Math.max(...apiMs)), apiMs.length ? '' : 'saknas i svaret (före)'],
];

console.log();
console.log('| Vad | p50 | max | |');
console.log('|---|---|---|---|');
for (const row of rows) console.log(`| ${row.join(' | ')} |`);
console.log();
console.log(`Total tid: ${ms(totalMs)} · kallstarter i svaren: ${coldStarts}`);
if (failed.length) {
  console.log(`Misslyckade uppladdningar: ${failed.map((u) => u.status).join(', ')}`);
  console.log(`Första felsvaret: ${JSON.stringify(failed[0].body)}`);
}