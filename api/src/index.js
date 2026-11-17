import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`API lyssnar på http://localhost:${config.port}`);
});