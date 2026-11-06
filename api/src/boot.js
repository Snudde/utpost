import { pool } from './db/client.js';
import { seed } from './db/seed.js';
import { migrateLogs } from './db/migrate-logs.js';
import { config } from './config.js';
import { app } from './app.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Vänta tills Postgres svarar på anrop
const waitForPostgres = async (retries = 30) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('select 1');
      return;
    } catch {
      console.log(`väntar på Postgres... (${i}/${retries})`);
      await sleep(1000);
    }
  }
  throw new Error('Kunde inte ansluta till Postgres efter 30 sekunder');
};

const boot = async () => {
  // Om SEED_ON_START=1 är satt (vilket staging.yaml sätter i Azure)
  if (process.env.SEED_ON_START === '1') {
    await waitForPostgres();

    // Kontrollera om databasen är tom (saknar users-tabell eller rader)
    let hasUsers = false;
    try {
      const res = await pool.query("select to_regclass('users') as exists;");
      if (res.rows[0]?.exists) {
        const countRes = await pool.query('select count(*) from users');
        hasUsers = Number(countRes.rows[0]?.count) > 0;
      }
    } catch {
      hasUsers = false;
    }

    // Om databasen är tom: seeda Postgres och migrera GPS-loggar till Mongo
    if (!hasUsers) {
      console.log('boot: tom databas – seedar');
      await seed({ closePool: false });
      await migrateLogs({ close: false });
    }
  }

  // 2. Starta Express-servern
  app.listen(config.port, () => {
    console.log(`API lyssnar på http://localhost:${config.port}`);
  });
};

boot().catch((err) => {
  console.error('Kunde inte starta applikationen:', err);
  process.exit(1);
});

// Håller servern vid liv vid eventuella ohanterade rejections
process.on('unhandledRejection', (err) => {
  console.error('Ohanterat fel:', err.message);
});