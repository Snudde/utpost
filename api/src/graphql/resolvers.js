import { GraphQLError } from 'graphql';

// En resolver är en funktion per fält: (parent, args, context) => värdet.
// Saknas en resolver läser GraphQL egenskapen med samma namn på parent – därför behöver
// Guide.title ingen funktion, men Guide.lengthKm gör det (kolumnen heter length_km).
const iso = (d) => new Date(d).toISOString();

export const resolvers = {
  Query: {
    guides: async (_, args, { query }) =>
      (await query('select * from guides order by updated_at desc')).rows,
    popularGuides: async (_, { limit }, { query }) =>
      (await query('select * from guides where published = true order by id desc limit $1', [limit])).rows,
    guide: async (_, { slug }, { query }) =>
      (await query('select * from guides where slug = $1', [slug])).rows[0] ?? null,
    regions: async (_, args, { query }) =>
      (await query('select distinct region from guides order by region')).rows.map((r) => r.region),
    tours: async (_, { limit }, { query }) =>
      (await query('select * from tours order by started_at desc limit $1', [Math.min(limit, 200)])).rows,
    tour: async (_, { id }, { query }) =>
      (await query('select * from tours where id = $1', [id])).rows[0] ?? null,
  },

  Mutation: {
    createTour: async (_, { input }, { query, user }) => {
      if (!user) {
        throw new GraphQLError('Du måste vara inloggad', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      const result = await query(
        `insert into tours (user_id, guide_id, title, started_at, distance_m, notes)
         values ($1,$2,$3,$4,$5,$6) returning *`,
        [user.id, input.guideId ?? null, input.title, input.startedAt, input.distanceM, input.notes ?? null],
      );
      return result.rows[0];
    },
  },

  // Fältresolvers: översätter kolumnnamn till schemats namn.
  Guide: {
    lengthKm: (guide) => guide.length_km,
    bodyHtml: (guide) => guide.body_html,
    heroImage: (guide) => guide.hero_image,
    updatedAt: (guide) => iso(guide.updated_at),
  },

  User: {
    displayName: (user) => user.display_name,
    // password_hash finns på raden men inte i schemat – då går den inte att fråga efter.
  },

  LogPoint: {
    recordedAt: (log) => iso(log.recorded_at),
    elevationM: (log) => log.elevation_m,
    heartRate: (log) => log.heart_rate,
  },

  // Relationerna. Varje funktion körs en gång PER TUR i svaret – och bara om klienten bad om
  // fältet. tours { title } ger 1 databasfråga; tours { title user { displayName } } ger 1 + 50.
  // Det är N+1-problemet, och det löser vi i M5.
  Tour: {
    startedAt: (tour) => iso(tour.started_at),
    distanceM: (tour) => tour.distance_m,
    user: async (tour, args, { query }) =>
      (await query('select * from users where id = $1', [tour.user_id])).rows[0],
    guide: async (tour, args, { query }) =>
      tour.guide_id ? (await query('select * from guides where id = $1', [tour.guide_id])).rows[0] : null,
    photos: async (tour, args, { query }) =>
      (await query('select * from photos where tour_id = $1', [tour.id])).rows,
    logs: async (tour, args, { query }) =>
      (await query('select * from tour_logs where tour_id = $1 order by recorded_at', [tour.id])).rows,
  },
};