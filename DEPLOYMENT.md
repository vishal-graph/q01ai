# Deployment Guide

## Vercel Deployment

This project is configured for serverless deployment on Vercel.

### Prerequisites

1. A Vercel account
2. Gemini API key from Google AI Studio

### Environment Variables

Configure the following environment variables in your Vercel project settings:

#### Required
- `GEMINI_API_KEY` - Your Google Gemini API key (get it from https://makersuite.google.com/app/apikey)

#### Optional
- `NODE_ENV` - Set to `production` (default)
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)

### Deployment Steps

1. **Push to GitHub** (already done)
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository: `vishal-graph/q01ai`
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add `GEMINI_API_KEY` with your API key
   - Click "Save"

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or manually trigger a deployment from the Vercel dashboard

### Project Structure

- `/api/questionnaire.ts` - Vercel serverless function entry point
- `/public/index.html` - Landing page
- `/test-ui.html` - Main chat UI
- `/apps/questionnaire/` - Core questionnaire service
- `/packages/` - Shared packages (ai, core)

### API Endpoints

- `GET /` - Landing page
- `GET /test-ui.html` - Chat UI
- `GET /healthz` - Health check
- `GET /readyz` - Readiness check
- `POST /questionnaires/start` - Start a new questionnaire
- `POST /questionnaires/:id/message` - Send a message
- `GET /questionnaires/:id` - Get questionnaire state
- `GET /admin/characters` - List all available characters

### Local Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
cd apps/questionnaire
pnpm dev
```

Server will run on http://localhost:8082

### Supported Services

- Interior Design
- Construction
- Home Automation
- Painting
- Solar Services
- Electrical Services

Each service has a dedicated AI consultant character with tailored questionnaire parameters.

