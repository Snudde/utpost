import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { clearCmsCache } from '../cms/contentful.js';

export const cmsRouter = Router();

// Fredagens labb (M9): Contentful anropar den här adressen när en notis publiceras eller
// avpubliceras (Settings > Webhooks i Contentful). Då töms cachen, och nästa besökare får det
// nya innehållet direkt – inte efter upp till en minut.
//
// Adressen är publik: vem som helst kan anropa den. Därför en hemlighet i en header, som bara vi
// och Contentful känner till. Utan den: 401. Jämförelsen görs i konstant tid, så att svarstiden
// inte avslöjar hur många tecken som var rätt. Är hemligheten inte satt på servern går ingen in.
const sameSecret = (given) => {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(config.cmsWebhookSecret);
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

cmsRouter.post('/webhook', (req, res) => {
  if (!sameSecret(req.headers['x-utpost-webhook-secret'])) {
    return res.status(401).json({ error: 'fel eller ingen webhook-hemlighet' });
  }
  clearCmsCache();
  // Contentful säger vad som hände i en header, t.ex. ContentManagement.Entry.publish
  console.log(`cms: webhook (${req.headers['x-contentful-topic'] ?? 'okänt ämne'}) – cachen tömd`);
  res.status(204).end();
});