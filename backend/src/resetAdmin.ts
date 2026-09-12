import bcrypt from 'bcryptjs';
import { pool, closeDatabase, withTransaction } from './db.js';
import { audit, httpError, secret } from './utils/http.js';

const email=process.argv[2]?.trim().toLowerCase();
if(!email)throw httpError(400,'Bruk: node backend/dist/resetAdmin.js administrator@eksempel.no');
const password=secret(18);
await withTransaction(async client=>{
  const result=await client.query("UPDATE users SET password_hash=$1,must_change_password=true,is_active=true,updated_at=now() WHERE email=$2 AND role='ADMIN' RETURNING id",[await bcrypt.hash(password,12),email]);
  const user=result.rows[0]; if(!user)throw httpError(404,'Aktiv eller deaktivert administrator med denne e-posten finnes ikke.');
  await client.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[user.id]);
  await audit(client,user.id,'admin.offline_password_reset','user',user.id);
});
console.log('Nytt midlertidig passord (vises bare nå):');
console.log(password);
await closeDatabase();
