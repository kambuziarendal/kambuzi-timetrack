import { app } from './app.js';
import { env } from './env.js';
import { migrate } from './migrate.js';
import { closeDatabase } from './db.js';
import { cleanupExpiredDemoUsers, startDemoCleanup } from './services/demoCleanup.js';

await migrate();
if (env.DEMO_MODE) await cleanupExpiredDemoUsers();
startDemoCleanup();
const server=app.listen(env.PORT,'0.0.0.0',()=>console.log(`Kambuzi Timeføring lytter på ${env.PORT}`));
async function shutdown(){server.close(async()=>{await closeDatabase();process.exit(0);});setTimeout(()=>process.exit(1),10_000).unref();}
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
