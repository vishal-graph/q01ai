import type { VercelRequest, VercelResponse } from '@vercel/node';
import createApp from '../apps/questionnaire/src/index';

const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  (app as any)(req, res);
}
