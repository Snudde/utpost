import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// M9: tester för webhooken som Contentful anropar när en notis eller guide publiceras.
//
// CMS-lagret byts mot en spy: testet ska se ATT cachen töms, inte prata med Contentful. Resten av
// contentful.js behövs inte här (GraphQL-servern importerar den, men anropas aldrig i de här testerna).
vi.mock('../cms/contentful.js', () => ({
  clearCmsCache: vi.fn(),
  cmsConfigured: () => false,
  publishedNotices: async () => [],
  previewNotices: async () => [],
  publishedGuideBody: async () => [],
  previewGuideBody: async () => [],
  toParagraphs: () => [],
}));

const { app } = await import('../app.js');
const { config } = await import('../config.js');
const { pool } = await import('../db/client.js');
const { mongo } = await import('../db/mongo.js');
const { clearCmsCache } = await import('../cms/contentful.js');

const HEMLIGHET = 'test-hemlighet-som-bara-testet-kanner-till';

let server;
let base;
const webhook = (headers = {}) =>
  fetch(`${base}/api/cms/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });

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

beforeEach(() => {
  config.cmsWebhookSecret = HEMLIGHET;
  clearCmsCache.mockClear();
});

describe('POST /api/cms/webhook', () => {
  it('med rätt hemlighet: 204 och cachen töms', async () => {
    const res = await webhook({
      'x-utpost-webhook-secret': HEMLIGHET,
      'x-contentful-topic': 'ContentManagement.Entry.publish',
    });
    expect(res.status).toBe(204);
    expect(clearCmsCache).toHaveBeenCalledTimes(1);
  });

  it('med fel hemlighet: 401 och cachen lämnas orörd', async () => {
    const res = await webhook({ 'x-utpost-webhook-secret': 'gissning' });
    expect(res.status).toBe(401);
    expect(clearCmsCache).not.toHaveBeenCalled();
  });

  it('utan hemlighet: 401 och cachen lämnas orörd', async () => {
    const res = await webhook();
    expect(res.status).toBe(401);
    expect(clearCmsCache).not.toHaveBeenCalled();
  });

  it('är ingen hemlighet satt på servern går ingen in – inte ens med en tom header', async () => {
    config.cmsWebhookSecret = '';
    const res = await webhook({ 'x-utpost-webhook-secret': '' });
    expect(res.status).toBe(401);
    expect(clearCmsCache).not.toHaveBeenCalled();
  });
});
