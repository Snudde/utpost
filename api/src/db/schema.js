import {
  pgTable, serial, text, integer, boolean, timestamp, doublePrecision,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const guides = pgTable('guides', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  region: text('region').notNull(),
  difficulty: text('difficulty').notNull(),
  lengthKm: doublePrecision('length_km').notNull(),
  // Redaktionen skickar in HTML som vi klistrar in här. Fungerar.
  bodyHtml: text('body_html').notNull(),
  heroImage: text('hero_image'),
  published: boolean('published').notNull().default(true),
  authorId: integer('author_id'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tours = pgTable('tours', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  guideId: integer('guide_id'),
  title: text('title').notNull(),
  startedAt: timestamp('started_at').notNull(),
  distanceM: integer('distance_m').notNull(),
  notes: text('notes'),
});

// En rad per mätpunkt. Växer med ca 300 rader per tur.
export const tourLogs = pgTable('tour_logs', {
  id: serial('id').primaryKey(),
  tourId: integer('tour_id').notNull(),
  recordedAt: timestamp('recorded_at').notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  elevationM: integer('elevation_m'),
  heartRate: integer('heart_rate'),
  note: text('note'),
});

export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  tourId: integer('tour_id').notNull(),
  filename: text('filename').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
