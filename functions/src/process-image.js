// M7: bildbearbetningen som en funktion – Azure Functions, Node v4-programmeringsmodellen.
// En HTTP-trigger, en handler. Det finns ingen server att starta och ingen port att lyssna på:
// plattformen äger processen (lokalt Core Tools med func start, i molnet Azure Functions) och
// anropar handlern för varje begäran. API:et anropar oss på /api/process-image.
import os from 'node:os';
import { app } from '@azure/functions';
import { processImage } from './image.js';

// Modulglobal: koden här ovanför körs en gång per process. Första anropet i en ny process är
// en kallstart – plattformen har just startat Node och läst in modulerna. Sedan är den varm.
let coldStart = true;

// Ett skydd så att ett felskrivet anrop inte ber om en buffert på flera GB (4 byte per pixel).
const MAX_PIXELS = 50_000_000;

app.http('process-image', {
  methods: ['POST'],
  // 'function' = anroparen måste skicka funktionsnyckeln (header x-functions-key) i Azure.
  // Lokalt kontrollerar func start ingen nyckel.
  authLevel: 'function',
  handler: async (request, context) => {
    const wasColdStart = coldStart;
    coldStart = false;

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'skicka JSON: { filename, width, height }' } };
    }
    const { filename, width, height } = body ?? {};
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > MAX_PIXELS) {
      return { status: 400, jsonBody: { error: 'width och height ska vara positiva heltal (högst 50 MP)' } };
    }

    const { variants, processingMs } = processImage(width, height);

    // context.log hamnar i func start-terminalen lokalt och i Application Insights/loggströmmen i Azure.
    context.log(
      `process-image (från pipelinen): ${filename} ${width}x${height} → ${variants.length} varianter på ${processingMs} ms` +
        (wasColdStart ? ' (kallstart)' : ''),
    );

    return {
      jsonBody: {
        variants,
        processingMs,
        coldStart: wasColdStart,
        // Vilken instans som svarade. WEBSITE_INSTANCE_ID sätts av Azure; lokalt blir det datorns namn.
        instance: process.env.WEBSITE_INSTANCE_ID ?? os.hostname(),
        node: process.version,
      },
    };
  },
});