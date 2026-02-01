import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { port } from './env.js';
import { runGapAnalysis } from './gap/handler.js';
import { logger } from './util/logger.js';
import { parseResumeHandler } from './resume-parser/handler.js';
import { saveProfileHandler } from './profile/handler.js';
import { recommendCoursesHandler } from './courses/recommend.js';
import { createGuestSessionHandler } from './session/guest.js';
import { updateSkillLevelsHandler } from './skills/updateLevels.js';
import { generateCourseRecommendations } from './course-recommendation/handler.js';
import type { ErrorRequestHandler } from 'express';

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
app.post('/profile', saveProfileHandler);
app.post('/courses/recommend', recommendCoursesHandler);
app.post('/session/guest', createGuestSessionHandler);
app.post('/skills/update-levels', updateSkillLevelsHandler);
app.post('/course-recommendations/generate', generateCourseRecommendations);

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ error: 'Upload failed', detail: err.message });
    return;
  }
  if (err instanceof Error) {
    logger.error('Unhandled server error', { error: err.message });
  } else {
    logger.error('Unhandled server error', { error: String(err) });
  }
  res.status(500).json({ error: 'Internal server error' });
};

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

app.listen(port, () => {
  logger.info('Gap analysis service listening', { port });
});
