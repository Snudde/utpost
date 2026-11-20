#!/usr/bin/env node
// M9: sätter upp innehållstypen Notis och tre notiser i ert eget Contentful-space.
//
//   npm run cms:setup
//
// Kräver två rader i .env (se .env.example):
//   CONTENTFUL_SPACE_ID          – Settings > General settings > Space ID
//   CONTENTFUL_MANAGEMENT_TOKEN  – Settings > CMA tokens > Create personal access token
//
// Skriptet pratar med Contentfuls Content Management API (api.contentful.com): det tredje API:et,
// det som SKRIVER. Appen använder det aldrig – den läser bara, med delivery- och preview-nyckeln.
// Går att köra flera gånger: innehållstypen och notiserna har fasta id:n och uppdateras på plats.
// Två notiser publiceras, den tredje lämnas som utkast (den syns bara i förhandsgranskningen).
const space = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const environment = process.env.CONTENTFUL_ENVIRONMENT ?? 'master';
if (!space || !token) {
  console.error('Saknar CONTENTFUL_SPACE_ID eller CONTENTFUL_MANAGEMENT_TOKEN i .env – se .env.example.');
  process.exit(1);
}
const base = `https://api.contentful.com/spaces/${space}/environments/${environment}`;
const paus = (ms) => new Promise((r) => setTimeout(r, ms));

// Ett anrop till CMA. version = postens nuvarande version: Contentful vägrar skriva över något
// som har ändrats sedan man läste det (409), så varje ändring måste säga vilken version den utgår från.
const cma = async (method, path, { body, version, contentType } = {}) => {
  await paus(200); // gratisnivån tillåter sju skrivningar i sekunden – vi håller oss långt under
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version !== undefined ? { 'X-Contentful-Version': String(version) } : {}),
      ...(contentType ? { 'X-Contentful-Content-Type': contentType } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method === 'GET') return null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.status === 204 ? null : res.json();
};

// Innehållsmodellen: fälten säger vad en notis ÄR. Nivån är ett val mellan två värden, inte en
// färg. Texten får innehålla fet, kursiv och länkar – inga rubriker, bilder eller tabeller –
// så redaktören kan inte förstöra layouten.
const notis = {
  name: 'Notis',
  description: 'En notis från redaktionen: driftinformation och varningar till besökarna.',
  displayField: 'rubrik',
  fields: [
    { id: 'rubrik', name: 'Rubrik', type: 'Symbol', required: true, localized: false, validations: [{ size: { max: 80 } }] },
    {
      id: 'text',
      name: 'Text',
      type: 'RichText',
      required: true,
      localized: false,
      validations: [
        { enabledMarks: ['bold', 'italic'], message: 'Bara fet och kursiv text' },
        { enabledNodeTypes: ['hyperlink'], message: 'Bara stycken och länkar' },
      ],
    },
    { id: 'niva', name: 'Nivå', type: 'Symbol', required: true, localized: false, validations: [{ in: ['info', 'varning'] }] },
    {
      id: 'guideSlug',
      name: 'Gäller guide (slug)',
      type: 'Symbol',
      required: false,
      localized: false,
      validations: [{ regexp: { pattern: '^[a-z0-9-]+$' }, message: 'Guidens slug, som i adressen: norra-myrleden-7' }],
    },
  ],
};

const text = (value, marks = []) => ({ nodeType: 'text', value, marks: marks.map((type) => ({ type })), data: {} });
const stycke = (...content) => ({ nodeType: 'paragraph', data: {}, content });
const dokument = (...content) => ({ nodeType: 'document', data: {}, content });

const notiser = [
  {
    id: 'utpost-notis-1',
    publicera: true,
    fields: {
      rubrik: 'Storforsbron är avstängd',
      niva: 'varning',
      text: dokument(
        stycke(text('Bron över Storforsen lagas till och med '), text('30 november', ['bold']), text('.')),
        stycke(text('Räkna med en omväg på tre kilometer.')),
      ),
    },
  },
  {
    id: 'utpost-notis-2',
    publicera: true,
    fields: {
      rubrik: 'Vinterguiderna är på väg',
      niva: 'info',
      text: dokument(stycke(text('Redaktionen går igenom lederna inför vintern. Uppdaterade guider kommer i december.'))),
    },
  },
  {
    id: 'utpost-notis-3',
    publicera: false,
    fields: {
      rubrik: 'Ny led till våren',
      niva: 'info',
      text: dokument(stycke(text('Vi öppnar en ny led i Jämtland i maj. Mer information kommer.'))),
    },
  },
];

const locales = await cma('GET', '/locales');
const locale = locales.items.find((l) => l.default).code;
console.log(`Space ${space}, miljö ${environment}, språk ${locale}`);

// Innehållstypen: skapa eller uppdatera, och aktivera (en innehållstyp måste aktiveras innan den går att använda).
const befintlig = await cma('GET', '/content_types/notis');
const typ = await cma('PUT', '/content_types/notis', { body: notis, version: befintlig?.sys.version });
await cma('PUT', '/content_types/notis/published', { version: typ.sys.version });
console.log(`✓ innehållstypen Notis (${notis.fields.length} fält)`);

// Notiserna. Varje fält är ett värde per språk, därav { [locale]: värde }.
for (const n of notiser) {
  const fields = Object.fromEntries(Object.entries(n.fields).map(([falt, varde]) => [falt, { [locale]: varde }]));
  const finns = await cma('GET', `/entries/${n.id}`);
  const post = await cma('PUT', `/entries/${n.id}`, { body: { fields }, version: finns?.sys.version, contentType: 'notis' });
  if (n.publicera) {
    await cma('PUT', `/entries/${n.id}/published`, { version: post.sys.version });
  } else if (finns?.sys.publishedVersion) {
    await cma('DELETE', `/entries/${n.id}/published`, { version: post.sys.version });
  }
  console.log(`✓ ${n.publicera ? 'publicerad' : 'utkast    '}  ${n.fields.rubrik}`);
}

console.log(`
Klart. Nu behöver appen två nycklar till, de som LÄSER:
  Settings > API keys > Add API key. Kopiera till .env:
    CONTENTFUL_DELIVERY_TOKEN  = Content Delivery API – access token   (bara publicerat)
    CONTENTFUL_PREVIEW_TOKEN   = Content Preview API – access token    (även utkast)
Starta om API:et (npm run dev) och öppna startsidan.`);
