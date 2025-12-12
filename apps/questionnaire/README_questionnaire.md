# Questionnaire Service (Standalone)

This package contains the **Express-based questionnaire microservice** plus a minimal HTML client for testing. It is the deployable unit used in demos and production, and wires together:

- The 9-parameter enquiry engine  
- Character registry loader  
- Gemini adapter and guardrails  
- A small, self-contained test UI.

---

## Supported Services

The service exposes the full service catalogue from the root project:

- Residential Construction (`residential_construction`)  
- Residential Interiors (`residential_interiors`)  
- Commercial Interiors (`commercial_interiors`)  
- Commercial Construction (`commercial_construction`)  
- Property Development (`property_development`)  
- Home Automation (`home_automation`)  
- Painting (`painting`)  
- Solar Services (`solar_services`)  
- Electrical Services (`electrical_services`)  
- Irrigation Automation (`irrigation_automation`)  
- Event Management (`event_management`)  
- Farm Infrastructure Setup (`farm_infrastructure`)  
- Plumbing Services (`plumbing_services`)

---

## Run Locally

```bash
cd apps/questionnaire
npm install
PORT=8082 npm run dev
```

The server starts on `http://localhost:8082`.

### Test UI

Open the bundled HTML client in your browser:

```text
http://localhost:8082/test-ui.html
```

Select a service chip to start an enquiry; the UI talks to the REST API under the hood.

---

## Environment Variables

These variables are read by the questionnaire app:

- `PORT` – Port to bind the Express server on (default `8082`).  
- `QUESTIONNAIRE_WEBHOOK_URL` – Optional URL to receive completion payloads.  
- `QUESTIONNAIRE_SESSION_TTL_MINUTES` – In-memory session TTL (default `45`).  
- `CHARACTER_REGISTRY_PATH` – Path to the character registry JSON (default `config/characters.json`).  
- `ENABLE_EQ_ENGINE` – Enable/disable empathy layer (default `true`).  
- `ENABLE_GUARDRAILS` – Enable/disable guardrail sanitation (default `true`).  
- `GEMINI_API_KEY` – Required for live LLM responses (when configured at the root).

### WhatsApp Freeflow (Aadhya)

- `WHATSAPP_CHARACTER_DEFAULT` – Default character id for WhatsApp (default `aadhya`).  
- `WHATSAPP_FREEFLOW_ENABLED` – Toggle freeflow mode (default `true`).  
- `EXTRACTION_CONFIDENCE_THRESHOLD_AUTO` – Auto-accept extracted slot confidence (default `0.75`).  
- `EXTRACTION_CONFIDENCE_THRESHOLD_TENTATIVE` – Tentative/confirm confidence (default `0.4`).  
- `MAX_TURNS_BEFORE_DIRECT_ASK` – When to force a direct ask for high-priority datapoints (default `3`).  
- `MAX_CONTEXT_TURNS` – Max transcript turns sent to LLM (default `6`).  

Applies only to WhatsApp (`channel: whatsapp`, `freeflow: true`). Web `/questionnaires` and the test UI remain unchanged.

### WhatsApp / Twilio integration

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` – Required to send/receive WhatsApp messages.  
- `TWILIO_MESSAGING_SERVICE_SID` – Optional; if set, used when sending interactive list/buttons.  
- `WHATSAPP_START_PHRASE` – Start trigger text (default `START`).  
- `WHATSAPP_DEFAULT_SERVICE` – Optional. If set, start phrase auto-starts this service. If empty, users will be prompted to pick from the full service list.  
- `QUESTIONNAIRE_BASE_URL` – Base URL for the internal questionnaire API (default `http://localhost:8082`).  
- `WHATSAPP_VERIFY_SIGNATURE` – Validate Twilio webhook signatures (`true`/`false`, default `true`).  
- `WHATSAPP_SESSION_TTL_MS` – Idle timeout for phone→session mapping (default `86400000`, 24h).  
- `WHATSAPP_WEBHOOK_URL` – Optional absolute URL used for signature verification when behind proxies.

---

## API Surface

See `openapi.yaml` for the full contract. The key endpoints:

- `POST /questionnaires`  
  - **Body**: `{ "service": "<service_id>", "channel": "web", "user": { ... } }`  
  - **Response**: Initial question, session metadata, empty parameter map.

- `POST /questionnaires/{id}/messages`  
  - **Body**: `{ "text": "user reply text" }`  
  - **Response**: Next AI message, updated parameter collection, completion flag.

- `GET /questionnaires/{id}`  
  - Inspect current transcript and parameter values.

- `POST /questionnaires/{id}/complete`  
  - Force completion (useful for admin/testing).

- `GET /admin/characters` / `POST /admin/characters/reload`  
  - Inspect and hot-reload the character registry.

---

## Completion Webhook

If `QUESTIONNAIRE_WEBHOOK_URL` is configured, the service will `POST` a JSON payload on successful completion:

```json
{
  "questionnaireId": "uuid",
  "service": "residential_interiors",
  "parameters": { "spaceType": "...", "budgetRange": "...", "...": "..." },
  "character": { "id": "aadhya-interior", "name": "Aadhya Rao - Residential Interiors" },
  "userRef": null,
  "channel": "web",
  "completedAt": "2025-10-12T12:34:56.000Z"
}
```

You can use this hook to persist enquiries into your own CRM, database, or workflow engine.

---

## Extending the Questionnaire

At the app level, adding a new service involves:

1. Adding parameters in `src/parameters.ts`.  
2. Creating a corresponding character in `config/characters.json`.  
3. Updating the service selector and trigger messages in `public/test-ui.html`.  
4. Ensuring the new service ID is wired into core types/schemas at the root project.

For deeper architectural details, see the root `README.md` and `Docs/` folder.
