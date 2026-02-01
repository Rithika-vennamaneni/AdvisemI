import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { port } from './env.js';
import { runGapAnalysis } from './gap/handler.js';
import { logger } from './util/logger.js';
import { parseResumeHandler } from './resume-parser/handler.js';

const app = express();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.post('/gap-analysis/run', runGapAnalysis);
app.post('/parse', upload.single('file'), parseResumeHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  logger.info('Gap analysis service listening', { port });
});
