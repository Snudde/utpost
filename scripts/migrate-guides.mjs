#!/usr/bin/env node
import { pool } from '../api/src/db/client.js';

const space = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const environment = process.env.CONTENTFUL_ENVIRONMENT ?? 'master';

if (!space || !token) {
    console.error('Saknar CONTENTFUL_SPACE_ID eller CONTENTFUL_MANAGEMENT_TOKEN i .env');
    process.exit(1);
}

const base = `https://api.contentful.com/spaces/${space}/environments/${environment}`;
const paus = (ms) => new Promise((r) => setTimeout(r, ms));

// CMA helper (samma som i cms-setup.mjs)
const cma = async (method, path, { body, version, contentType } = {}) => {
    await paus(200); // Håller oss under gratisnivåns gräns på 7 anrop/s
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

// Innehållsmodellen för en guide:
// - slug: adressen/identifieraren som kopplar ihop CMS:et med databasen
// - title: redaktionens rubrik
// - text: Rich Text begränsad till semantiska block (h2, h3, listor, stycken, fet, kursiv, länkar).
const guideContentType = {
    name: 'Guide',
    description: 'Redaktionens guider och ledbeskrivningar.',
    displayField: 'title',
    fields: [
        {
            id: 'title',
            name: 'Titel',
            type: 'Symbol',
            required: true,
            localized: false,
            validations: [{ size: { max: 120 } }],
        },
        {
            id: 'slug',
            name: 'Slug',
            type: 'Symbol',
            required: true,
            localized: false,
            validations: [
                { regexp: { pattern: '^[a-z0-9-]+$' }, message: 'Endast små bokstäver a-z, siffror och bindestreck' },
                { unique: true },
            ],
        },
        {
            id: 'text',
            name: 'Text',
            type: 'RichText',
            required: true,
            localized: false,
            validations: [
                { enabledMarks: ['bold', 'italic'], message: 'Endast fet och kursiv text är tillåten' },
                {
                    enabledNodeTypes: ['heading-2', 'heading-3', 'unordered-list', 'hyperlink'],
                    message: 'Endast H2, H3, punktlistor, stycken och länkar är tillåtna',
                },
            ],
        },
    ],
};

// Hjälpfunktioner för att bygga Contentful Rich Text AST
const textNode = (value, marks = []) => ({
    nodeType: 'text',
    value,
    marks: marks.map((type) => ({ type })),
    data: {},
});

// Parsar textbitar med enkla inline-taggar (<em>, <strong>)
const parseInlineRuns = (html) => {
    const runs = [];
    const regex = /<em>(.*?)<\/em>|<strong>(.*?)<\/strong>|([^<]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        if (match[1]) runs.push(textNode(match[1], ['italic']));
        else if (match[2]) runs.push(textNode(match[2], ['bold']));
        else if (match[3] && match[3].trim()) runs.push(textNode(match[3]));
    }
    return runs.length > 0 ? runs : [textNode(html.replace(/<[^>]+>/g, ''))];
};

// Konverterar guidens HTML-block till Contentful Rich Text-dokument
const htmlToRichText = (html) => {
    const content = [];

    // Matchar h2, h3, p och ul-block ur body_html
    const blockRegex = /<h2>(.*?)<\/h2>|<h3>(.*?)<\/h3>|<p>(.*?)<\/p>|<ul>([\s\S]*?)<\/ul>/g;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
        if (match[1]) {
            // <h2>
            content.push({
                nodeType: 'heading-2',
                data: {},
                content: [textNode(match[1])],
            });
        } else if (match[2]) {
            // <h3>
            content.push({
                nodeType: 'heading-3',
                data: {},
                content: [textNode(match[2])],
            });
        } else if (match[3]) {
            // <p>
            content.push({
                nodeType: 'paragraph',
                data: {},
                content: parseInlineRuns(match[3]),
            });
        } else if (match[4]) {
            // <ul> med <li>
            const listItems = [];
            const liRegex = /<li>(.*?)<\/li>/g;
            let liMatch;
            while ((liMatch = liRegex.exec(match[4])) !== null) {
                listItems.push({
                    nodeType: 'list-item',
                    data: {},
                    content: [
                        {
                            nodeType: 'paragraph',
                            data: {},
                            content: parseInlineRuns(liMatch[1]),
                        },
                    ],
                });
            }
            if (listItems.length > 0) {
                content.push({
                    nodeType: 'unordered-list',
                    data: {},
                    content: listItems,
                });
            }
        }
    }

    return {
        nodeType: 'document',
        data: {},
        content,
    };
};

const run = async () => {
    // 1. Skapa / uppdatera innehållstypen 'guide'
    const befintligTyp = await cma('GET', '/content_types/guide');
    const typ = await cma('PUT', '/content_types/guide', { body: guideContentType, version: befintligTyp?.sys.version });
    await cma('PUT', '/content_types/guide/published', { version: typ.sys.version });
    console.log('✓ Innehållstyp skapad & aktiverad');

    // 2. Hämta de 40 guiderna från Postgres
    const { rows: guides } = await pool.query('SELECT id, slug, title, body_html FROM guides ORDER BY id');
    console.log(`Hittade ${guides.length} guider i databasen att migrera...`);

    // 3. Hämta standardspråk (locale)
    const locales = await cma('GET', '/locales');
    const locale = locales.items.find((l) => l.default).code;

    // 4. Migrera varje guide (idempotent PUT mot fast id `utpost-guide-${g.slug}`)
    for (const g of guides) {
        const entryId = `utpost-guide-${g.slug}`;
        const richTextDoc = htmlToRichText(g.body_html);

        const fields = {
            title: { [locale]: g.title },
            slug: { [locale]: g.slug },
            text: { [locale]: richTextDoc },
        };

        const finns = await cma('GET', `/entries/${entryId}`);
        const post = await cma('PUT', `/entries/${entryId}`, {
            body: { fields },
            version: finns?.sys.version,
            contentType: 'guide',
        });

        // Publicera posten
        await cma('PUT', `/entries/${entryId}/published`, { version: post.sys.version });
        console.log(`✓ Publicerad: ${g.title} (${entryId})`);
    }

    await pool.end();
    console.log('Klart! Alla guider migrerade.');
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});