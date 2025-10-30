import 'dotenv/config';
import './polyfills';
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
// optional: lighter logger, avoid pino-http types for now
import { router as api } from './routes';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  // Basic request logging
  app.use((req, _res, next) => { logger.debug({ path: req.path, method: req.method }, 'req'); next(); });

  // Pure in-memory mode; integrate your own storage via webhook or by forking routes

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (_req, res) => res.json({ status: 'ready' }));
  app.use('/', api);
  return app;
}

async function main() {
  const app = createApp();
  const PORT = Number(process.env.PORT || 8082);
  app.listen(PORT, () => {
    logger.info({ PORT }, 'questionnaire service listening');
  });
}

// Start local server only when not running on Vercel (serverless)
if (!process.env.VERCEL) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

export default createApp;


