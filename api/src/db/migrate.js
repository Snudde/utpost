// Vi kör inga migrations-verktyg. Den här filen skapar tabellerna.
import { pool } from './client.js';

export const createTables = async () => {
  await pool.query(`
    create table if not exists users (
      id serial primary key,
      email text not null,
      password_hash text not null,
      display_name text not null,
      role text not null default 'member',
      created_at timestamp not null default now()
    );
    create table if not exists guides (
      id serial primary key,
      slug text not null,
      title text not null,
      region text not null,
      difficulty text not null,
      length_km double precision not null,
      body_html text not null,
      hero_image text,
      published boolean not null default true,
      author_id integer,
      updated_at timestamp not null default now()
    );
    create table if not exists tours (
      id serial primary key,
      user_id integer not null,
      guide_id integer,
      title text not null,
      started_at timestamp not null,
      distance_m integer not null,
      notes text
    );
    create table if not exists tour_logs (
      id serial primary key,
      tour_id integer not null,
      recorded_at timestamp not null,
      lat double precision not null,
      lon double precision not null,
      elevation_m integer,
      heart_rate integer,
      note text
    );
    create table if not exists photos (
      id serial primary key,
      tour_id integer not null,
      filename text not null,
      width integer not null,
      height integer not null,
      created_at timestamp not null default now()
    );
  `);
};
