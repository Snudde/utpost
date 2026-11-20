import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../config.js';
import { toParagraphs, publishedNotices, previewNotices, clearCmsCache } from './contentful.js';

// Enhetstester för CMS-lagret (M9). Contentful anropas aldrig: fetch byts mot en funktion som
// svarar med det Contentful skulle ha svarat. Så går testerna i pipelinen utan nycklar och
// utan nät – och vi testar VÅR kod (omformningen, cachen, felhanteringen), inte deras tjänst.
const text = (value, marks = []) => ({ nodeType: 'text', value, marks: marks.map((type) => ({ type })), data: {} });
const paragraph = (...content) => ({ nodeType: 'paragraph', data: {}, content });
const document = (...content) => ({ nodeType: 'document', data: {}, content });
const entry = (id, fields) => ({ sys: { id, updatedAt: '2026-11-18T08:00:00Z' }, fields });

const avstangd = entry('n1', {
  rubrik: 'Leden är avstängd',
  niva: 'varning',
  guideSlug: 'norra-myrleden-7',
  text: document(paragraph(text('Bron vid '), text('Storforsen', ['bold']), text(' lagas.'))),
});
const valkommen = entry('n2', { rubrik: 'Välkommen', niva: 'info', text: document(paragraph(text('Hej!'))) });

// Svarar som Contentful: { items: [...] }. svar kan vara en lista eller en funktion av adressen.
const fakeContentful = (svar) =>
  vi.fn(async (url) => ({
    ok: true,
    status: 200,
    json: async () => ({ items: typeof svar === 'function' ? svar(String(url)) : svar }),
  }));

beforeEach(() => {
  Object.assign(config, { cmsSpaceId: 'space1', cmsDeliveryToken: 'delivery-nyckel', cmsPreviewToken: 'preview-nyckel' });
  clearCmsCache();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('rich text → stycken av textbitar', () => {
  it('ett stycke med fet text blir textbitar med märken', () => {
    expect(toParagraphs(avstangd.fields.text)).toEqual([
      {
        runs: [
          { text: 'Bron vid ', bold: false, italic: false, href: null },
          { text: 'Storforsen', bold: true, italic: false, href: null },
          { text: ' lagas.', bold: false, italic: false, href: null },
        ],
      },
    ]);
  });

  it('en länk blir en textbit med href – men bara till http(s) eller en sida hos oss', () => {
    const lank = (uri) => ({ nodeType: 'hyperlink', data: { uri }, content: [text('läs mer')] });
    const hrefs = toParagraphs(
      document(paragraph(lank('https://utpost.se/leder'), lank('/guider/norra-myrleden-7'), lank('javascript:alert(1)'))),
    )[0].runs.map((run) => run.href);
    expect(hrefs).toEqual(['https://utpost.se/leder', '/guider/norra-myrleden-7', null]);
  });

  it('blocktyper vi inte renderar hoppas över, och ett tomt fält ger inga stycken', () => {
    const rubrik = { nodeType: 'heading-2', data: {}, content: [text('Rubrik')] };
    expect(toParagraphs(document(rubrik, paragraph(text('Stycke'))))).toHaveLength(1);
    expect(toParagraphs(undefined)).toEqual([]);
  });
});

describe('publicerade notiser', () => {
  it('hämtas från delivery-API:et med nyckeln i en header, och formas om till schemat', async () => {
    const fetch = fakeContentful([avstangd, valkommen]);
    vi.stubGlobal('fetch', fetch);

    const notices = await publishedNotices();

    expect(notices.map((n) => [n.id, n.title, n.level, n.guideSlug, n.status])).toEqual([
      ['n1', 'Leden är avstängd', 'varning', 'norra-myrleden-7', 'published'],
      ['n2', 'Välkommen', 'info', null, 'published'],
    ]);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('https://cdn.contentful.com/spaces/space1/environments/master/entries?content_type=notis');
    expect(url).not.toContain('delivery-nyckel');
    expect(options.headers.Authorization).toBe('Bearer delivery-nyckel');
  });

  it('cachas: två frågor i rad kostar ett anrop till Contentful', async () => {
    const fetch = fakeContentful([valkommen]);
    vi.stubGlobal('fetch', fetch);
    await publishedNotices();
    await publishedNotices();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('40 frågor på samma gång med kall cache delar på ett anrop (en lista med guider och deras notiser)', async () => {
    const fetch = fakeContentful([avstangd]);
    vi.stubGlobal('fetch', fetch);
    const svar = await Promise.all(Array.from({ length: 40 }, () => publishedNotices()));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(svar.every((notices) => notices.length === 1)).toBe(true);
  });

  it('är CMS:et nere svarar vi med det senast hämtade, eller en tom lista – aldrig ett fel', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const nere = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    vi.stubGlobal('fetch', nere);
    expect(await publishedNotices()).toEqual([]);

    vi.stubGlobal('fetch', fakeContentful([valkommen]));
    expect(await publishedNotices()).toHaveLength(1);
    config.cmsCacheSeconds = 0; // cachen har gått ut …
    vi.stubGlobal('fetch', nere);
    expect(await publishedNotices()).toHaveLength(1); // … men det gamla svaret är bättre än inget
    config.cmsCacheSeconds = 60;
  });

  it('utan space och nyckel är CMS:et avstängt: tom lista, inget anrop', async () => {
    Object.assign(config, { cmsSpaceId: '', cmsDeliveryToken: '' });
    const fetch = fakeContentful([valkommen]);
    vi.stubGlobal('fetch', fetch);
    expect(await publishedNotices()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('förhandsgranskningen', () => {
  it('hämtar från preview-API:et med preview-nyckeln och säger vad som är utkast och vad som är ändrat', async () => {
    const utkast = entry('n3', { rubrik: 'Ny led i vår', niva: 'info' }); // aldrig publicerad, och utan text än
    const andrad = entry('n2', { ...valkommen.fields, rubrik: 'Välkommen tillbaka' }); // publicerad, sedan ändrad
    const fetch = fakeContentful((url) => (url.startsWith('https://preview.contentful.com') ? [avstangd, andrad, utkast] : [avstangd, valkommen]));
    vi.stubGlobal('fetch', fetch);

    const notices = await previewNotices();

    expect(notices.map((n) => [n.id, n.status])).toEqual([
      ['n1', 'published'],
      ['n2', 'changed'],
      ['n3', 'draft'],
    ]);
    expect(notices[2].body).toEqual([]);
    const preview = fetch.mock.calls.find(([url]) => url.startsWith('https://preview.contentful.com'));
    expect(preview[1].headers.Authorization).toBe('Bearer preview-nyckel');
  });
});
