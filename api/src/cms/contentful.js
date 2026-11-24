import { config } from '../config.js';

// M9 (skuld 10): redaktionens innehåll bor i ett headless CMS – här Contentful. Den här filen är
// det ENDA stället i Utpost som vet det. Resolvers frågar efter notiser och får dem i schemats
// form; byter ni CMS är det den här filen som skrivs om, inte schemat och inte klienten.
//
// Contentful har två läs-API:er med samma adresser men olika värd och olika nyckel:
//   cdn.contentful.com      + delivery-token  → bara det som är PUBLICERAT
//   preview.contentful.com  + preview-token   → senaste versionen av allt, även UTKAST
// Två tillstånd, två nycklar. Båda nycklarna stannar här på servern (.env) – klienten ser dem aldrig.
const HOSTS = { published: 'https://cdn.contentful.com', preview: 'https://preview.contentful.com' };

// Utan space och nyckel är CMS:et avstängt: appen fungerar, den har bara inga notiser.
// Så kör pipelinen (inga CMS-hemligheter i testerna) och den som inte har satt upp ett space än.
export const cmsConfigured = () => Boolean(config.cmsSpaceId && config.cmsDeliveryToken);

const entries = async (contentType, { preview = false } = {}) => {
  const host = preview ? HOSTS.preview : HOSTS.published;
  const token = preview ? config.cmsPreviewToken : config.cmsDeliveryToken;
  const url =
    `${host}/spaces/${config.cmsSpaceId}/environments/${config.cmsEnvironment}/entries` +
    `?content_type=${contentType}&order=-sys.updatedAt&limit=100`;
  // Nyckeln går i en header, inte i adressen – adresser hamnar i loggar.
  // Fem sekunder räcker: hellre en startsida utan notiser än en startsida som hänger.
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Contentful svarade ${res.status}`);
  return (await res.json()).items;
};

// En länk som redaktören skrivit in ska gå till en webbadress eller en sida hos oss. Allt annat
// (javascript:, data:) blir ingen länk alls – href är också ett ställe där skript kan smita in (M8, A05).
const safeHref = (uri) => (typeof uri === 'string' && /^(https?:\/\/|\/)/.test(uri) ? uri : null);

// Rich text i Contentful är inte HTML utan ett träd av noder: ett dokument med stycken, och i
// styckena textbitar med märken (fet, kursiv) och länkar. Här formas trädet om till det schemat
// lovar: stycken av textbitar. Blocktyper vi inte känner till hoppas över – det är här ni bygger
// ut när guiderna flyttar in (rubriker, listor, bilder).
export const toParagraphs = (document) => {
  const has = (node, mark) => (node.marks ?? []).some((m) => m.type === mark);
  const runs = (nodes, href = null) =>
    (nodes ?? []).flatMap((node) => {
      if (node.nodeType === 'text') {
        return node.value ? [{ text: node.value, bold: has(node, 'bold'), italic: has(node, 'italic'), href }] : [];
      }
      if (node.nodeType === 'hyperlink') return runs(node.content, safeHref(node.data?.uri));
      return [];
    });
  return (document?.content ?? []).flatMap((node) => {
    if (node.nodeType === 'paragraph') {
      const r = runs(node.content);
      return r.length > 0 ? [{ runs: r }] : [];
    }
    if (node.nodeType === 'heading-2' || node.nodeType === 'heading-3') {
      const r = runs(node.content).map((run) => ({ ...run, bold: true }));
      return r.length > 0 ? [{ runs: r }] : [];
    }
    if (node.nodeType === 'unordered-list') {
      return (node.content ?? []).flatMap((item) => {
        // En list-item i Contentful innehåller vanligtvis ett paragraph-block
        return (item.content ?? []).flatMap((p) => {
          const itemRuns = runs(p.content);
          if (itemRuns.length === 0) return [];
          return [
            {
              runs: [
                { text: '• ', bold: false, italic: false, href: null },
                ...itemRuns,
              ],
            },
          ];
        });
      });
    }
    // Blocktyper vi inte känner till hoppas över
    return [];
  });
};

// Contentfuls post → schemats Notice. Fälten heter som redaktionen kallar dem (rubrik, niva);
// schemat håller sig till engelska som resten av API:et. Ett utkast kan sakna fält – därav ??.
const toNotice = (entry, status = 'published') => ({
  id: entry.sys.id,
  title: entry.fields?.rubrik ?? '',
  level: entry.fields?.niva ?? 'info',
  body: toParagraphs(entry.fields?.text),
  guideSlug: entry.fields?.guideSlug ?? null,
  status,
});

// Cachen: Contentful räknar varje anrop (gratisnivån har ett tak per månad), och en notis ändras
// några gånger i veckan – inte 50 gånger i sekunden. Därför hämtar vi högst en gång i minuten och
// svarar ur minnet däremellan. Priset: en publicerad ändring syns efter upp till en minut.
let cache = { at: 0, notices: null, guidesBySlug: null };
let pendingNotices = null;
let pendingGuides = null;

export const clearCmsCache = () => {
  cache = { at: 0, notices: null, guidesBySlug: null };
};

const fetchNotices = async () => {
  try {
    const notices = (await entries('notis')).map((entry) => toNotice(entry));
    console.log(`cms: hämtade ${notices.length} publicerade notiser från Contentful`);
    cache = { at: Date.now(), notices };
    return notices;
  } catch (err) {
    // CMS:et är ett system till som kan vara nere. Då svarar vi med det vi senast hämtade,
    // eller utan notiser – men resten av sidan ska fortfarande gå att läsa.
    console.error(`cms: kunde inte hämta notiser (${err.message}) – svarar med ${cache.notices ? 'det senast hämtade' : 'en tom lista'}`);
    return cache.notices ?? [];
  }
};

export const publishedNotices = async () => {
  if (!cmsConfigured()) return [];
  if (cache.notices && Date.now() - cache.at < config.cmsCacheSeconds * 1000) return cache.notices;
  // En lista med 40 guider frågar efter notiser 40 gånger på samma gång (Guide.notices). Med kall
  // cache ska det bli ETT anrop till Contentful, inte 40: alla som frågar medan anropet pågår
  // väntar på samma svar.
  pendingNotices ??= fetchNotices().finally(() => {
    pendingNotices = null;
  });
  return pendingNotices;
};

// Förhandsgranskningen: preview-API:et ger senaste versionen av allt. Vi hämtar det publicerade
// också, för att kunna säga vad som skiljer: finns posten inte publicerad är den ett utkast (draft),
// finns den men med annat innehåll är den ändrad men inte publicerad (changed). Cachas aldrig –
// redaktören vill se det hen just skrev.
export const previewNotices = async () => {
  const [latest, published] = await Promise.all([entries('notis', { preview: true }), entries('notis')]);
  const publishedFields = new Map(published.map((entry) => [entry.sys.id, JSON.stringify(entry.fields)]));
  return latest.map((entry) => {
    const live = publishedFields.get(entry.sys.id);
    const status = live === undefined ? 'draft' : live === JSON.stringify(entry.fields) ? 'published' : 'changed';
    return toNotice(entry, status);
  });
};

const fetchGuides = async () => {
  try {
    const items = await entries('guide');
    // Mappa upp varje guide på dess slug: slug -> toParagraphs(entry.fields.text)
    const guidesBySlug = new Map(
      items.map((entry) => [
        entry.fields?.slug,
        toParagraphs(entry.fields?.text)
      ])
    );
    console.log(`cms: hämtade ${guidesBySlug.size} guider från Contentful`);
    cache = { ...cache, at: Date.now(), guidesBySlug };
    return guidesBySlug;
  } catch (err) {
    console.error(`cms: kunde inte hämta guider (${err.message})`);
    return cache.guidesBySlug ?? new Map();
  }
};


export const publishedGuideBody = async (slug) => {
  if (!cmsConfigured()) return [];
  if (cache.guidesBySlug && Date.now() - cache.at < config.cmsCacheSeconds * 1000) {
    return cache.guidesBySlug.get(slug) ?? [];
  }

  pendingGuides ??= fetchGuides().finally(() => {
    pendingGuides = null;
  });

  const guides = await pendingGuides
  return guides.get(slug) ?? [];
};

export const previewGuideBody = async (slug) => {
  if (!config.cmsSpaceId || !config.cmsPreviewToken) return [];

  try {
    // Hämtar senaste versionen (även utkast) från Contentfuls preview-API. Cachas aldrig!
    const items = await entries('guide', { preview: true });
    const guide = items.find((entry) => entry.fields?.slug === slug);
    return toParagraphs(guide?.fields?.text);
  } catch (err) {
    console.error(`cms: kunde inte förhandsgranska guide ${slug} (${err.message})`);
    return [];
  }
};
