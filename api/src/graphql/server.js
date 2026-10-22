import { getOperationAST } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db/client.js';
import { mongo, mongoDb } from '../db/mongo.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { createLoaders } from './loaders.js';

// Samma token som REST-routerna använder (lib/auth.js). Ingen token = user är null;
// det är varje resolvers sak att avgöra om det räcker.
const userFrom = (request) => {
  const header = request.headers.get('authorization');
  if (!header) return null;
  try {
    return jwt.verify(header.replace('Bearer ', ''), config.jwtSecret);
  } catch {
    return null;
  }
};

// Mätningen: hur många databasfrågor (Postgres + MongoDB) kostade det här anropet?
// Skrivs i API-loggen OCH läggs i svaret under `extensions.databasfragor`, så att siffran
// syns i GraphiQL, i nätverksfliken – och går att testa (M5: integrationstestet läser den).
const countQueries = {
  onExecute: ({ args }) => ({
    onExecuteDone: ({ result, setResult }) => {
      if (Symbol.asyncIterator in result) return; // strömmande svar – inte våra
      const name = getOperationAST(args.document, args.operationName)?.name?.value ?? 'anonym';
      const n = args.contextValue.stats.queries;
      console.log(`graphql ${name}: ${n} databasfrågor`);
      setResult({ ...result, extensions: { ...result.extensions, databasfragor: n } });
    },
  }),
};

// En endpoint: POST /graphql. GET /graphql i browsern ger GraphiQL, en editor för att prova frågor.
export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  plugins: [countQueries],
  // context byggs en gång per anrop och skickas till varje resolver som tredje argument.
  context: ({ request }) => {
    const stats = { queries: 0 };
    const query = (sql, params) => {
      stats.queries += 1;
      return pool.query(sql, params);
    };
    const mongoFind = async (collection, filter, projection) => {
      stats.queries += 1;
      await mongo.connect(); // gör inget om klienten redan är ansluten
      return mongoDb().collection(collection).find(filter, { projection }).toArray();
    };
    return {
      user: userFrom(request),
      stats,
      query,
      mongoFind,
      // M5: loaders skapas PER ANROP. Två frågor i samma anrop delar cache, två anrop gör det inte.
      loaders: createLoaders({ query, mongoFind }),
    };
  },
});