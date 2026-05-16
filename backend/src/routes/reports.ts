import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCsv, createPdf } from '../services/reportService.js';
export const reportsRouter = Router();
reportsRouter.use(requireAuth);
function params(req: any) {
  const userIds = req.user.role === 'ADMIN' && req.query.userIds ? String(req.query.userIds).split(',').filter(Boolean) : undefined;
  return {
    from: new Date(String(req.query.from ?? new Date(new Date().getFullYear(),0,1).toISOString())),
    to: new Date(String(req.query.to ?? new Date().toISOString())),
    filters: req.user.role === 'ADMIN'
      ? { userId: req.query.userId as string | undefined, userIds, positionId: req.query.positionId as string | undefined }
      : { userId: req.user.id }
  };
}
reportsRouter.get('/csv', async (req, res) => { const p = params(req); const csv = await createCsv(req.user!.companyId, p.from, p.to, p.filters); res.header('Content-Type','text/csv; charset=utf-8').attachment('timetrack-report.csv').send(csv); });
reportsRouter.get('/pdf', async (req, res) => { const p = params(req); const pdf = await createPdf(req.user!.companyId, p.from, p.to, p.filters); res.header('Content-Type','application/pdf').attachment('timetrack-report.pdf').send(pdf); });
