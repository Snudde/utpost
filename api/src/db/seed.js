import { pool } from './client.js';
import { createTables } from './migrate.js';

const REGIONS = ['Jämtland', 'Dalarna', 'Lappland', 'Bohuslän', 'Småland', 'Södermanland', 'Härjedalen', 'Skåne'];
const DIFFICULTY = ['lätt', 'medel', 'svår'];
const FIRST = ['Anna', 'Erik', 'Sara', 'Johan', 'Maria', 'Ali', 'Nina', 'Oskar', 'Lisa', 'Pontus', 'Ida', 'Hassan'];
const LAST = ['Berg', 'Lind', 'Ek', 'Nord', 'Sund', 'Holm', 'Falk', 'Ahlgren', 'Osman', 'Waller', 'Ryd', 'Kvist'];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

const bodyHtml = (title, region) => `
<h2>Om ${title}</h2>
<p>En av de mest omtyckta lederna i ${region}. Passar bra från maj till oktober.</p>
<h3>Så tar du dig hit</h3>
<p>Buss ${100 + rnd(400)} från centralorten, cirka ${20 + rnd(60)} minuter. Parkering finns vid leden.</p>
<h3>Bra att veta</h3>
<ul><li>Vindskydd vid halva sträckan</li><li>Ingen service utmed leden</li><li>Mobiltäckning delvis</li></ul>
<p><em>Senast granskad av redaktionen.</em></p>`.trim();

const run = async () => {
  await createTables();
  await pool.query('truncate photos, tour_logs, tours, guides, users restart identity');

  const userIds = [];
  for (let i = 0; i < 12; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const email = `${name.toLowerCase().replace(' ', '.')}${i}@example.com`;
    const res = await pool.query(
      `insert into users (email, password_hash, display_name, role) values ($1,$2,$3,$4) returning id`,
      [email, 'plaintext:hemligt123', name, i === 0 ? 'editor' : 'member'],
    );
    userIds.push(res.rows[0].id);
  }

  const guideIds = [];
  for (let i = 0; i < 40; i++) {
    const region = pick(REGIONS);
    const title = `${pick(['Stora', 'Lilla', 'Norra', 'Södra', 'Gamla'])} ${pick(['Björnleden', 'Hällstigen', 'Sjörundan', 'Myrleden', 'Klippstigen'])} ${i + 1}`;
    const res = await pool.query(
      `insert into guides (slug, title, region, difficulty, length_km, body_html, hero_image, published, author_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        title.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/\s+/g, '-'), title, region, pick(DIFFICULTY),
        Math.round((3 + Math.random() * 25) * 10) / 10,
        bodyHtml(title, region), `hero-${i + 1}.jpg`, i % 9 !== 0, userIds[0],
      ],
    );
    guideIds.push(res.rows[0].id);
  }

  let logCount = 0;
  for (let i = 0; i < 200; i++) {
    const started = new Date(Date.now() - rnd(500) * 86400000);
    const res = await pool.query(
      `insert into tours (user_id, guide_id, title, started_at, distance_m, notes)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [
        pick(userIds), Math.random() > 0.25 ? pick(guideIds) : null,
        `Tur ${i + 1}`, started, 2000 + rnd(30000),
        Math.random() > 0.6 ? 'Blött väder, mycket folk vid rastplatsen.' : null,
      ],
    );
    const tourId = res.rows[0].id;

    const points = 20 + rnd(20);
    const values = [];
    const params = [];
    for (let p = 0; p < points; p++) {
      const base = params.length;
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`);
      params.push(
        tourId, new Date(started.getTime() + p * 300000),
        58 + Math.random() * 10, 12 + Math.random() * 8,
        100 + rnd(900), 90 + rnd(70),
      );
    }
    await pool.query(
      `insert into tour_logs (tour_id, recorded_at, lat, lon, elevation_m, heart_rate) values ${values.join(',')}`,
      params,
    );
    logCount += points;

    for (let f = 0; f < rnd(4); f++) {
      await pool.query(
        `insert into photos (tour_id, filename, width, height) values ($1,$2,$3,$4)`,
        [tourId, `tour-${tourId}-${f + 1}.jpg`, 4032, 3024],
      );
    }
  }

  console.log(`Seed klar: 12 användare, 40 guider, 200 turer, ${logCount} loggpunkter.`);
  await pool.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
