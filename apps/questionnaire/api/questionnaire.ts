import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

let app: any = null;

function getApp() {
  if (!app) {
    try {
      // Import directly from sources; Vercel bundles relative imports
      const createApp = require('../src/index').default || require('../src/index');
      app = createApp();
    } catch (error) {
      console.error('Failed to create app:', error);
      throw error;
    }
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- TEMPORARY DEBUG ENDPOINT ---
  // This will help us see what files are actually in the serverless function bundle.
  if (req.url && req.url.startsWith('/debug-ls')) {
    const CWD = process.cwd(); // Should be /var/task
    try {
      const files = fs.readdirSync(CWD, { withFileTypes: true });
      const contents = files.map(f => ({ name: f.name, isDirectory: f.isDirectory() }));
      
      let configContents = null;
      try {
        const configPath = path.join(CWD, 'config');
        if (fs.existsSync(configPath)) {
          const configFiles = fs.readdirSync(configPath);
          configContents = configFiles;
        }
      } catch (e) {
        configContents = `Error reading config dir: ${e instanceof Error ? e.message : String(e)}`;
      }

      return res.status(200).json({
        message: "Debug file listing",
        CWD,
        contents,
        configDirExists: fs.existsSync(path.join(CWD, 'config')),
        configDirContents: configContents
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to list directory', message: error instanceof Error ? error.message : String(error) });
    }
  }
  // --- END DEBUG ENDPOINT ---

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


