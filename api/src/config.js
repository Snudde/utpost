// TODO: flytta ut det här nån gång. /marcus 2021-03-11
// M3: adresserna läses från miljön när den finns (compose sätter dem), annars gäller de gamla
// localhost-värdena. M6: inga hemligheter för någon annan miljö än den egna datorn i koden –
// staging får sina via secrets i Azure.
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://utpost:utpost@localhost:5433/utpost',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://utpost:utpost@localhost:27017/utpost?authSource=admin',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-only-for-local-testing',
  port: Number(process.env.PORT ?? 4000),
  // M6: commiten imagen byggdes från (build-arg i jobbet Image). Lokalt finns ingen – då "dev".
  // || och inte ??: Dockerfilens ENV GIT_SHA=$GIT_SHA blir en tom sträng när build-arg saknas.
  gitSha: process.env.GIT_SHA || 'dev',
  uploadDir: './uploads',
  // M7: adress och valfri funktionsnyckel till bildfunktionen (lokalt func start på 7071).
  imageFunctionUrl: process.env.IMAGE_FUNCTION_URL ?? 'http://localhost:7071/api/process-image',
  imageFunctionKey: process.env.IMAGE_FUNCTION_KEY ?? '',
  cmsSpaceId: process.env.CONTENTFUL_SPACE_ID ?? '',
  cmsEnvironment: process.env.CONTENTFUL_ENVIRONMENT ?? 'master',
  cmsDeliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN ?? '',
  cmsPreviewToken: process.env.CONTENTFUL_PREVIEW_TOKEN ?? '',
  cmsCacheSeconds: Number(process.env.CMS_CACHE_SECONDS ?? 60),
  cmsWebhookSecret: process.env.CMS_WEBHOOK_SECRET ?? '',

};

// En hemlighet som går att gissa är ingen hemlighet: kräv den, och kräv att den är lång.
export const assertJwtSecret = () => {
  const secret = config.jwtSecret ?? '';
  if (secret.length < 32 || secret === 'utpost-dev-secret-byt-i-molnet') {
    console.error('JWT_SECRET saknas eller är för kort (minst 32 tecken) – API:et startar inte. Generera: openssl rand -hex 32');
    process.exit(1);
  }
};
