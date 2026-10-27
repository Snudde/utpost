import { describe, it, expect, afterAll } from 'vitest';
import { yoga } from './server.js';
import { pool } from '../db/client.js';
import { mongo } from '../db/mongo.js';
import { sign } from '../lib/auth.js';

// Integrationstester (M5): hela kedjan fråga → schema → resolvers → databas, mot riktiga
// Postgres och MongoDB. Ingen port behövs: yoga är en fetch-handler, så vi anropar den direkt
// med samma request som browsern skulle skicka. Adressen spelar ingen roll – bara sökvägen.
const graphql = async (query, { variables, token } = {}) => {
  const res = await yoga.fetch('http://utpost/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return { status: res.status, ...(await res.json()) };
};

afterAll(async () => {
  await pool.end();
  await mongo.close();
});

describe('GraphQL-API:et mot riktig databas', () => {
  it('turlistan: 50 turer med vem som gick – för två databasfrågor, inte 51', async () => {
    const { data, errors, extensions } = await graphql(/* GraphQL */ `
      query Turer {
        tours {
          id
          title
          user {
            displayName
          }
        }
      }
    `);
    expect(errors).toBeUndefined();
    expect(data.tours).toHaveLength(50);
    for (const tour of data.tours) expect(tour.user.displayName).toEqual(expect.any(String));
    expect(extensions.databasfragor).toBeLessThanOrEqual(2);
  });
   it('guide(slug) som inte finns är null – inte ett fel', async () => {
    const { data, errors } = await graphql(/* GraphQL */ `
      query Saknas {
        guide(slug: "finns-inte") {
          title
        }
      }
    `);
    expect(errors).toBeUndefined();
    expect(data.guide).toBeNull();
  });

  it('ett fält som inte finns ger errors – med statuskod 200', async () => {
    const { status, data, errors } = await graphql('{ guides { titel } }');
    expect(status).toBe(200);
    expect(data).toBeUndefined();
    expect(errors[0].message).toContain('Cannot query field "titel"');
  });

  it('createTour utan token nekas med koden UNAUTHENTICATED', async () => {
    const { data, errors } = await graphql(/* GraphQL */ `
      mutation NyTur {
        createTour(input: { title: "Testtur", startedAt: "2026-10-23T09:00:00Z", distanceM: 1000 }) {
          id
        }
      }
    `);
    expect(data).toBeNull();
    expect(errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('createTour med token skapar turen i den inloggades namn', async () => {
    // Samma JWT som REST-inloggningen ger. Användare 1 finns alltid efter npm run seed.
    const user = (await pool.query('select id, email, role, display_name from users where id = 1')).rows[0];
    const token = sign(user);
    const { data, errors } = await graphql(
      /* GraphQL */ `
        mutation NyTur($input: CreateTourInput!) {
          createTour(input: $input) {
            id
            title
            user {
              displayName
            }
          }
        }
      `,
      { variables: { input: { title: 'Testtur', startedAt: '2026-10-23T09:00:00Z', distanceM: 1000 } }, token },
    );
    expect(errors).toBeUndefined();
    expect(data.createTour.title).toBe('Testtur');
    expect(data.createTour.user.displayName).toBe(user.display_name);
    // Städa: testet lämnar inget efter sig i databasen.
    await pool.query('delete from tours where id = $1', [data.createTour.id]);
  });

  it('mätpunkterna kommer från MongoDB och är lika många som i Postgres', async () => {
    const { rows } = await pool.query('select count(*)::int as n from tour_logs where tour_id = 1');
    const { data, errors, extensions } = await graphql(/* GraphQL */ `
      query Tur {
        tour(id: 1) {
          logs {
            recordedAt
            lat
          }
        }
      }
    `);
    expect(errors).toBeUndefined();
    expect(data.tour.logs).toHaveLength(rows[0].n); // migreringen tappade inget
    expect(extensions.databasfragor).toBe(2); // en i Postgres (turen), en i Mongo (dokumentet)
  });
});

