import { config } from './config.js';
import { app } from './app.js';

app.listen(config.port, () => {
  console.log(`API lyssnar på http://localhost:${config.port}`);
});

// Servern dog i produktion en fredag när någon skrev in ett ogiltigt id.
// Det här håller den vid liv. Anropet får inget svar, men resten funkar. /marcus 2022-09-02
process.on('unhandledRejection', (err) => {
  console.error('Ohanterat fel:', err.message);
});
