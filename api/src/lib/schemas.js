import { z } from 'zod';

// M8 (skuld 9): här står vad API:et tar emot – ett schema per request-body. Klassen kan Zod sedan
// kurs 4; det nya är var kontrollen sitter: på servern, före varje route, oavsett vad klienten gjort.
// Gränserna är medvetna: ett lösenord på 8 tecken, en titel på 120, en bild på högst 20 000 px –
// skriv en kommentar när ni ändrar dem.

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8, 'minst 8 tecken').max(200),
  displayName: z.string().trim().min(1).max(80),
  // Redaktionen skapar sina egna konton via samma formulär och kryssar i "redaktör".
  role: z.enum(['member', 'editor']).optional(),
});

export const createTourSchema = z.object({
  title: z.string().trim().min(1).max(120),
  guideId: z.coerce.number().int().positive().optional().nullable(),
  startedAt: z.iso.datetime({ offset: true }),
  distanceM: z.coerce.number().int().min(0).max(1_000_000),
  notes: z.string().max(2000).optional().nullable(),
});

// PATCH /api/tours/:id – byt titel eller anteckningar på en tur i efterhand (önskemål från appen).
export const updateTourSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => v.title !== undefined || v.notes !== undefined, { message: 'title eller notes krävs' });

// POST /api/photos (M7): bara mått och filnamn – bytes skickas inte. Taket 20 000 px på varje
// sida matchar funktionens egen gräns (50 MP): en begäran om en bild på 10 miljarder pixlar ska
// stoppas här, innan den når funktionen (och innan den lagras).
export const photoUploadSchema = z.object({
  tourId: z.coerce.number().int().positive(),
  filename: z.string().trim().min(1).max(255),
  width: z.coerce.number().int().min(1).max(20_000),
  height: z.coerce.number().int().min(1).max(20_000),
});

// GET /api/guides/search?q=…  – query-strängen är också indata.
export const searchSchema = z.object({
  q: z.string().trim().max(100).default(''),
});

// Id i adressen: /api/tours/:id ska vara ett positivt heltal, inte "1 or 1=1".
export const idParam = z.coerce.number().int().positive();