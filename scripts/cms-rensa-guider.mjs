#!/usr/bin/env node
// M9: tar bort guider i Contentful som inte hör till seedens 40 fasta guider.
//
// Före fasta slugs i api/src/db/seed.js fick varje seedad databas egna, slumpade slugs, och varje
// körning av migrate-guides.mjs lade till 40 nya poster i Contentful. Det här skriptet städar bort
// allt som inte matchar seedens slugs, så att Contentful har exakt de 40 guider appen frågar efter.
//
//   npm run cms:rensa-guider               visar vad som skulle tas bort (ändrar ingenting)
//   npm run cms:rensa-guider -- --verkstall  avpublicerar och raderar dem
//
// Kräver CONTENTFUL_SPACE_ID och CONTENTFUL_MANAGEMENT_TOKEN i .env, som migrate-guides.mjs.
// Går att köra om: finns inget att ta bort gör det ingenting.
import { guideTitle, guideSlug } from '../api/src/db/seed.js';

const space = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const environment = process.env.CONTENTFUL_ENVIRONMENT ?? 'master';
const verkstall = process.argv.includes('--verkstall');

if (!space || !token) {
  console.error('Saknar CONTENTFUL_SPACE_ID eller CONTENTFUL_MANAGEMENT_TOKEN i .env');
  process.exit(1);
}

const base = `https://api.contentful.com/spaces/${space}/environments/${environment}`;
const paus = (ms) => new Promise((r) => setTimeout(r, ms));

const cma = async (method, path, { version } = {}) => {
  await paus(200); // under gratisnivåns gräns på 7 anrop/s
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version !== undefined ? { 'X-Contentful-Version': String(version) } : {}),
    },
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.status === 204 ? null : res.json();
};

const run = async () => {
  const behall = new Set(Array.from({ length: 40 }, (_, i) => guideSlug(guideTitle(i))));

  // Management-API:et ger alla poster, även utkast och avpublicerade – inte bara de publicerade.
  const poster = [];
  for (let skip = 0; ; skip += 100) {
    const sida = await cma('GET', `/entries?content_type=guide&limit=100&skip=${skip}`);
    poster.push(...sida.items);
    if (poster.length >= sida.total) break;
  }

  const locales = await cma('GET', '/locales');
  const locale = locales.items.find((l) => l.default).code;
  const slugOf = (post) => post.fields?.slug?.[locale];

  const taBort = poster.filter((post) => !behall.has(slugOf(post)));
  const kvar = poster.length - taBort.length;
  const saknas = [...behall].filter((slug) => !poster.some((post) => slugOf(post) === slug));

  console.log(`Guider i Contentful: ${poster.length}. Matchar seeden: ${kvar}. Tas bort: ${taBort.length}.`);
  if (saknas.length > 0) {
    console.log(`Saknas i Contentful (${saknas.length}) – kör npm run cms:migrate-guides mot en nyseedad databas: ${saknas.join(', ')}`);
  }
  for (const post of taBort) console.log(`  – ${slugOf(post)} (${post.sys.id})`);

  if (!verkstall) {
    if (taBort.length > 0) console.log('\nProvkörning – ingenting ändrat. Kör med --verkstall för att ta bort dem.');
    return;
  }

  for (const post of taBort) {
    let version = post.sys.version;
    if (post.sys.publishedVersion) {
      const avpublicerad = await cma('DELETE', `/entries/${post.sys.id}/published`, { version });
      version = avpublicerad.sys.version;
    }
    await cma('DELETE', `/entries/${post.sys.id}`, { version });
    console.log(`✓ Borttagen: ${slugOf(post)} (${post.sys.id})`);
  }
  console.log(`Klart! ${taBort.length} guider borttagna, ${kvar} kvar.`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
