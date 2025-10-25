# Questionnaire Service (Standalone)

A plug-and-play service to run 9-parameter conversational questionnaires per service (Construction, Interior Design, Home Automation, Painting).

## Run

```bash
cd apps/questionnaire
pnpm install
MONGO_URI=mongodb://localhost:27017/tatvaops PORT=8082 pnpm dev
```

## Env
- PORT (default 8082)
- MONGO_URI
- QUESTIONNAIRE_WEBHOOK_URL (optional)
- QUESTIONNAIRE_SESSION_TTL_MINUTES (default 45)
- CHARACTER_REGISTRY_PATH (default config/characters.json)
- ENABLE_EQ_ENGINE (default true)
- ENABLE_GUARDRAILS (default true)

## API
See `openapi.yaml` for full contract.

- POST `/questionnaires` → start
- POST `/questionnaires/{id}/messages` → continue
- GET `/questionnaires/{id}` → state
- POST `/questionnaires/{id}/complete` → complete
- GET `/admin/characters`, POST `/admin/characters/reload`

## Webhook
When configured, the service will POST on completion with `{ questionnaireId, service, parameters, character, userRef, channel, completedAt }`.

## Extend
Add new service parameters in `src/parameters.ts` with nine param definitions.
