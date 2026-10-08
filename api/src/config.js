// TODO: flytta ut det här nån gång. /marcus 2021-03-11
// M3: adresserna läses från miljön när den finns (compose sätter dem), annars gäller de gamla
// localhost-värdena. Lösenorden ligger fortfarande i koden – det är skuld 1 och betalas i M6.
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://utpost:utpost@localhost:5433/utpost',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin',
  jwtSecret: 'utpost-super-secret-2021',
  port: Number(process.env.PORT ?? 4000),
  uploadDir: './uploads',
};
