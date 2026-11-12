import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app.js';
import { pool } from '../db/client.js';
import { mongo } from '../db/mongo.js';
import { sign } from '../lib/auth.js';

// M8 (skuld 9): säkerhetstester mot REST-API:et, mot riktig databas – samma upplägg som
// GraphQL-testerna i graphql/server.test.js (lokalt mot compose-databaserna, i pipelinen mot
// services). Appen startas på en ledig port (0) och stängs efter testerna.
//
// Regeln från docs/testing.md: varje lagat hål har ett test som var RÖTT före fixen. Det är
// testet som bevisar hålet – inte en skärmdump – och det som hindrar hålet från att komma tillbaka.
let server;
let base;
const api = (path, { method = 'GET', body, token } = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const userRow = async (id) =>
  (await pool.query('select id, email, role, display_name from users where id = $1', [id])).rows[0];

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await mongo.close();
});

describe('A07 Authentication Failures – inloggningen', () => {
  it('svaret på en lyckad inloggning innehåller token och användaren – men aldrig password_hash', async () => {
    const user = await userRow(1);
    const res = await api('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'hemligt123' } });
    expect(res.status).toBe(200);
    const svar = await res.json();
    expect(svar.token).toEqual(expect.any(String));
    expect(svar.user.email).toBe(user.email);
    expect(JSON.stringify(svar)).not.toContain('password_hash');
    expect(JSON.stringify(svar)).not.toContain('hemligt123');
  });

  it('fel lösenord och okänd e-post ger samma svar (401, samma text)', async () => {
    const user = await userRow(1);
    const felLosen = await api('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'fel' } });
    const okand = await api('/api/auth/login', { method: 'POST', body: { email: 'finns.inte@example.com', password: 'fel' } });
    expect(felLosen.status).toBe(401);
    expect(okand.status).toBe(401);
    expect(await felLosen.json()).toEqual(await okand.json());
  });

  it('lösenordet i databasen är hashat, inte klartext', async () => {
    const { rows } = await pool.query("select count(*)::int as n from users where password_hash like 'plaintext:%'");
    expect(rows[0].n).toBe(0);
  });

  it('registrering med för kort lösenord ger 400 med vad som var fel', async () => {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: { email: 'ny@example.com', password: 'kort', displayName: 'Ny' },
    });
    expect(res.status).toBe(400);
    const svar = await res.json();
    expect(svar.error).toBe('ogiltig indata');
    expect(svar.issues[0].path).toBe('password');
  });
});

describe('A01 Broken Access Control – vems tur är det?', () => {
  it('DELETE /api/tours/:id utan token ger 401 och turen finns kvar', async () => {
    const res = await api('/api/tours/1', { method: 'DELETE' });
    expect(res.status).toBe(401);
    const { rows } = await pool.query('select id from tours where id = 1');
    expect(rows).toHaveLength(1);
  });

  it('en medlem kan inte ta bort någon annans tur (403)', async () => {
    const tour = (await pool.query('select id, user_id from tours where id = 1')).rows[0];
    // en annan medlem än turens ägare (och inte redaktör)
    const other = (
      await pool.query("select id, email, role from users where id <> $1 and role = 'member' limit 1", [tour.user_id])
    ).rows[0];
    const res = await api(`/api/tours/${tour.id}`, { method: 'DELETE', token: sign(other) });
    expect(res.status).toBe(403);
    expect((await pool.query('select id from tours where id = 1')).rows).toHaveLength(1);
  });

  it('ägaren kan ta bort sin egen tur', async () => {
    const owner = await userRow(1);
    const created = await pool.query(
      `insert into tours (user_id, title, started_at, distance_m) values ($1, 'Testtur M8', now(), 100) returning id`,
      [owner.id],
    );
    const res = await api(`/api/tours/${created.rows[0].id}`, { method: 'DELETE', token: sign(owner) });
    expect(res.status).toBe(200);
    expect((await pool.query('select id from tours where id = $1', [created.rows[0].id])).rows).toHaveLength(0);
  });

  it('POST /api/photos utan token ger 401 – uppladdning kräver inloggning', async () => {
    const res = await api('/api/photos', {
      method: 'POST',
      body: { tourId: 1, filename: 'fjall.jpg', width: 4000, height: 3000 },
    });
    expect(res.status).toBe(401);
  });
});

describe('A05 Injection – sökningen', () => {
  it("ett citattecken i sökordet ger 200 och en tom lista, inte 500", async () => {
    const res = await api(`/api/guides/search?q=${encodeURIComponent("'")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('en vanlig sökning hittar guider i landskapet', async () => {
    const region = (await pool.query('select region from guides limit 1')).rows[0].region;
    const res = await api(`/api/guides/search?q=${encodeURIComponent(region)}`);
    expect(res.status).toBe(200);
    const guides = await res.json();
    expect(guides.length).toBeGreaterThan(0);
    for (const g of guides) expect(g.region).toBe(region);
  });
});

describe('Validering av indata – A10 Mishandling of Exceptional Conditions', () => {
  it('en bild med orimliga mått stoppas med 400 innan något sparas', async () => {
    const owner = await userRow(1);
    const before = (await pool.query('select count(*)::int as n from photos')).rows[0].n;
    const res = await api('/api/photos', {
      method: 'POST',
      token: sign(owner),
      body: { tourId: 1, filename: 'enorm.jpg', width: 1_000_000, height: 1_000_000 },
    });
    expect(res.status).toBe(400);
    const svar = await res.json();
    expect(svar.issues.map((i) => i.path)).toEqual(expect.arrayContaining(['width', 'height']));
    const after = (await pool.query('select count(*)::int as n from photos')).rows[0].n;
    expect(after).toBe(before);
  });

  it('ett id som inte är ett tal ger 400, inte ett ohanterat fel', async () => {
    const res = await api('/api/tours/abc');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'ogiltigt id' });
  });

  it('trasig JSON ger 400 med ett svar – inte ett anrop som hänger', async () => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"email": ',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'ogiltig JSON' });
  });
});