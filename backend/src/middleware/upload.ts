import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { env } from '../env.js';
fs.mkdirSync(env.uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
});
export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
export const publicUploadPath = (filename: string) => path.join('/uploads', path.basename(filename));
