import { getOperationAST } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db/client.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

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

// Skriver en rad per anrop: hur många databasfrågor den här GraphQL-frågan kostade.
const logQueryCount = {
  onExecute: ({ args }) => ({
    onExecuteDone: () => {
      const name = getOperationAST(args.document, args.operationName)?.name?.value ?? 'anonym';
      console.log(`graphql ${name}: ${args.contextValue.stats.queries} databasfrågor`);
    },
  }),
};

// En endpoint: POST /graphql. GET /graphql i browsern ger GraphiQL, en editor för att prova frågor.
export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  plugins: [logQueryCount],
  // context byggs en gång per anrop och skickas till varje resolver som tredje argument.
  context: ({ request }) => {
    const stats = { queries: 0 };
    return {
      user: userFrom(request),
      stats,
      query: (sql, params) => {
        stats.queries += 1;
        return pool.query(sql, params);
      },
    };
  },
});