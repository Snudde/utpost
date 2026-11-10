import { afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';

const queryMock = vi.fn();
vi.mock('../db/client.js', () => ({
  pool: { query: queryMock },
}));

vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    config: {
      ...actual.config,
      imageFunctionUrl: 'https://utpost-fn.test/api/process-image',
      imageFunctionKey: 'test-key',
    },
  };
});

const { app } = await import('../app.js');

describe('POST /api/photos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    queryMock.mockReset();
  });

  it('skickar bilddata till Azure Function, sparar i Postgres och returnerar varianter, tid och coldStart', async () => {
    const fnResponse = {
      variants: [
        { size: 1600, signature: '70872261' },
        { size: 800, signature: '791333b' },
      ],
      processingMs: 85,
      coldStart: true,
      instance: 'inst-1',
      node: 'v22.23.4',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fnResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    queryMock.mockResolvedValue({
      rows: [
        {
          id: 42,
          tour_id: 1,
          filename: 'fjall.jpg',
          width: 4000,
          height: 3000,
          created_at: '2026-11-10T10:00:00.000Z',
        },
      ],
    });

    const res = await request(app)
      .post('/api/photos')
      .send({ tourId: 1, filename: 'fjall.jpg', width: 4000, height: 3000 });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://utpost-fn.test/api/process-image',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-functions-key': 'test-key',
        },
        body: JSON.stringify({ filename: 'fjall.jpg', width: 4000, height: 3000 }),
      }),
    );
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      id: 42,
      tour_id: 1,
      filename: 'fjall.jpg',
      variants: fnResponse.variants,
      processingMs: 85,
      coldStart: true,
      instance: 'inst-1',
    });
    expect(typeof res.body.apiMs).toBe('number');
  });

  it('svarar 400 på ogiltig indata utan att anropa funktionen', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app)
      .post('/api/photos')
      .send({ tourId: 1, filename: 'fjall.jpg', width: 0, height: 3000 });

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('svarar 502 utan att spara i databasen om bildfunktionen inte går att nå', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await request(app)
      .post('/api/photos')
      .send({ tourId: 1, filename: 'fjall.jpg', width: 4000, height: 3000 });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('ECONNREFUSED');
    expect(queryMock).not.toHaveBeenCalled();
  });
});
