import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { env } from './env.js';
import { optionalAuth, requireCsrf } from './middleware/auth.js';
import { setupRouter } from './routes/setup.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';
import { timeEntriesRouter } from './routes/timeEntries.js';
import { reportsRouter } from './routes/reports.js';

export const app=express();
app.set('trust proxy',env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],fontSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],baseUri:["'self'"],formAction:["'self'"]}}}));
app.use(express.json({limit:'64kb'}));
app.use(rateLimit({windowMs:60_000,limit:300,standardHeaders:true,legacyHeaders:false}));
app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
app.use(optionalAuth);
app.use(requireCsrf);
app.get('/health/live',(_req,res)=>res.json({ok:true,name:'Kambuzi Timeføring'}));
app.get('/health/ready',async(_req,res)=>{try{await pool.query('SELECT 1');const migration=await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');res.json({ok:true,database:'ok',migration:migration.rows[0]?.version??null});}catch{res.status(503).json({ok:false,database:'error'});}});
app.use('/api/setup',setupRouter);
app.use('/api/auth',authRouter);
app.use('/api/me',meRouter);
app.use('/api/admin',adminRouter);
app.use('/api/time-entries',timeEntriesRouter);
app.use('/api/reports',reportsRouter);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../frontend/dist');
if(existsSync(root)){
  app.use(express.static(root,{index:false,maxAge:'1h',immutable:false}));
  app.get(/^(?!\/api\/|\/health\/).*/,(_req,res)=>res.sendFile(path.join(root,'index.html')));
}
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof ZodError)return res.status(400).json({message:'Sjekk at feltene er fylt ut riktig.',details:err.issues.map(issue=>({path:issue.path.join('.'),message:issue.message}))});
  const error=err as {status?:number;code?:string;message?:string};
  if(error.code==='23505')return res.status(409).json({message:'Verdien finnes allerede.'});
  if(error.code==='23503')return res.status(409).json({message:'Oppføringen er i bruk og kan ikke fjernes.'});
  if((error.status??500)>=500)console.error(error);
  res.status(error.status??500).json({message:error.status?error.message:'En uventet feil oppstod.'});
});
