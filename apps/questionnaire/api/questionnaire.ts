import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any = null;

function getApp() {
  if (!app) {
    try {
      // Dynamic require to avoid TypeScript resolution issues
      const createApp = require('../dist/index').default || require('../dist/index');
      app = createApp();
    } catch (error) {
      console.error('Failed to create app:', error);
      throw error;
    }
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = getApp();
    return new Promise<void>((resolve, reject) => {
      expressApp(req, res, (err: any) => {
        if (err) {
          console.error('Express error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) });
  }
}


