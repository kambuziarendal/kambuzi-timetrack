import { app } from './app.js';
import { env } from './env.js';
app.listen(env.port, () => console.log(`TimeTrack API kjører på port ${env.port}`));
