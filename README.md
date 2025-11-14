# Q.01AI

**Standalone, plug-and-play 9-parameter conversational questionnaire** for Construction, Interior Design, Home Automation, and Painting services.

## Features

- **9 Services** with 9-parameter models each
- **Character Registry** with hot-reload (config/characters.json)
- **EQ Engine** for empathy and tone modulation
- **Guardrails** for safe, compliant responses
- **Pure In-Memory** (no external DB required; integrate storage via webhook or fork)
- **Gemini AI** integration
- **OpenAPI** spec included

## Quick Start

```bash
cd apps/questionnaire
pnpm install
PORT=8082 pnpm dev
```

## API

- `POST /questionnaires` - Start (returns id + first question)
- `POST /questionnaires/{id}/messages` - Continue (returns next question or completion)
- `GET /questionnaires/{id}` - Get state
- `POST /questionnaires/{id}/complete` - Force complete (returns all 9 parameters)
- `GET /admin/characters` - List characters
- `POST /admin/characters/reload` - Hot-reload character registry
- `PATCH /admin/characters/{id}/tone` - Update tone/empathy phrases live

## Configuration

Environment variables (all optional):
- `PORT` (default: 8082)
- `QUESTIONNAIRE_WEBHOOK_URL` (optional; fires on completion)
- `CHARACTER_REGISTRY_PATH` (default: config/characters.json)
- `ENABLE_EQ_ENGINE` (default: true)
- `ENABLE_GUARDRAILS` (default: true)
- `GEMINI_API_KEY` (for real AI; omit for mock responses)

## Integration

### As a Service
Deploy and call REST endpoints from any client.

### As a Module (fork)
Copy `apps/questionnaire/` into your project. Customize `src/models/Questionnaire.ts` to use your own storage, or consume the completion webhook.

## Extend

Add a new service:
1. Update `src/parameters.ts` with 9 parameter definitions.
2. Update `config/characters.json` with a new character for that service.
3. Reload via `POST /admin/characters/reload`.

## Documentation

- OpenAPI: `apps/questionnaire/openapi.yaml`
- Character System: `Docs/CHARACTER_SYSTEM.md`
- 9-Parameter Model: `Docs/9_PARAMETER_ENQUIRY_MODEL.md`
