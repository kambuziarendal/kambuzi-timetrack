import { prisma } from '../src/db.js';
import { hashPassword } from '../src/services/authService.js';
async function main() {
  const company = await prisma.company.upsert({ where: { id: 'seed-company' }, update: {}, create: { id: 'seed-company', name: 'Demo Bedrift AS', orgNumber: '999999999', address: 'Storgata 1, 4800 Arendal', workRules: { create: {} }, positions: { create: [{ name: 'Servitør', color: '#16a34a' }, { name: 'Kokk', color: '#dc2626' }] } } });
  await prisma.user.upsert({ where: { email: 'admin@timetrack.no' }, update: {}, create: { companyId: company.id, firstName: 'Demo', lastName: 'Admin', email: 'admin@timetrack.no', passwordHash: await hashPassword('Passord123!'), role: 'ADMIN' } });
}
main().finally(() => prisma.$disconnect());
