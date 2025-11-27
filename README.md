# Q.01AI — Conversational Questionnaire Platform

Q.01AI is a **Gemini-powered conversational intake engine** that captures nine critical parameters per service through warm, structured dialogue. Each service is represented by a richly crafted AI character with guardrails, empathy cues, and domain expertise. Out of the box, the questionnaire supports **13 residential, commercial, and infrastructure services**, making it ready for builders, consultants, and operations teams who need accurate requirements without repetitive forms.

---

## Table of Contents

1. [Project Highlights](#project-highlights)  
2. [Supported Services & Characters](#supported-services--characters)  
3. [Repository Layout](#repository-layout)  
4. [Getting Started](#getting-started)  
5. [Environment Configuration](#environment-configuration)  
6. [Running the Questionnaire](#running-the-questionnaire)  
7. [API Overview](#api-overview)  
8. [Conversation Lifecycle](#conversation-lifecycle)  
9. [Character & Prompt System](#character--prompt-system)  
10. [Extending the Platform](#extending-the-platform)  
11. [Testing, Linting & Quality](#testing-linting--quality)  
12. [Deployment Notes](#deployment-notes)  
13. [Additional Documentation](#additional-documentation)

---

## Project Highlights

- ✅ **13 production-ready services** with 9-parameter intake models.  
- 🤝 **Ultra-specific AI characters** with detailed personas, guardrails, and EQ semantics.  
- 🧠 **Gemini 2.x integration** with prompt composer, empathy modulation, and sanitisation against option leaks.  
- 🔄 **Hot-reloadable character registry** backed by JSON Schema validation.  
- 📦 **Monorepo structure** (pnpm workspaces) hosting core utilities, AI adapters, and the questionnaire app.  
- ⚙️ **Pure in-memory session store** for easy embedding into existing stacks.  
- 🌐 **REST API + Test UI** for rapid demos and workflow integration.  
- 🛡️ **Guardrails & parameter validation** to prevent junk data and keep conversations human.

---

## Supported Services & Characters

| Service ID | Friendly Name | Character | Persona Highlights |
|------------|---------------|-----------|--------------------|
| `residential_interiors` | Residential Interiors | Aadhya Rao | Visionary listener helping homeowners shape design visions; warm and exploratory tone. |
| `residential_construction` | Residential Construction | Arvind Narayan | Structured civil engineer guiding owners from foundation to finishing with clarity. |
| `commercial_interiors` | Commercial Interiors & Fit-Out | Shreya Rao | Creative-yet-structured consultant balancing brand, ergonomics, and execution. |
| `commercial_construction` | Commercial Construction Delivery | Vishal Gowda | Timeline disciplinarian aligning multi-trade execution for offices, retail, warehouses. |
| `property_development` | Property Development & Vendor Control | Aditya Shekhar | Development orchestrator helping builders manage vendors, risks, and compliance. |
| `home_automation` | Home Automation | Riya Mehta | Smart-home strategist aligning automation goals with lifestyle patterns. |
| `painting` | Painting & Finishes | Manjunath Gowda | Surface expert focusing on preparation, finishes, and brand-safe execution. |
| `solar_services` | Solar Services | Kavya Sharma | Solar guru matching rooftop capacity with ROI and subsidy considerations. |
| `electrical_services` | Electrical Safety | Vivek Desai | Safety-first electrical consultant handling audits, rewiring, and load balancing. |
| `irrigation_automation` | Irrigation Automation | Raghav Srinivasan | Calm agritech specialist optimising precision watering and automation. |
| `event_management` | Event Management | Ananya Rao | Memory maker balancing emotions, logistics, and budget clarity. |
| `farm_infrastructure` | Farm Infrastructure Setup | Harish Kulkarni | Farm builder aligning irrigation, greenhouses, and structural milestones. |
| `plumbing_services` | Plumbing Services | Ramesh Gowda | Methodical plumbing expert solving leaks, installations, and material choices. |

> Full persona, tone, EQ, and guardrail details live in `apps/questionnaire/config/characters.json`.

---

## Repository Layout

```
.
├── apps/
│   └── questionnaire/                # Express API + test UI bundle
│       ├── src/                      # Routes, engine, store, prompt plumbing
│       ├── public/test-ui.html       # In-browser demo client
│       ├── config/                   # Character registry & JSON schema
│       └── README_questionnaire.md   # Service-specific instructions
├── packages/
│   ├── core/                         # Shared types, schemas, character loader
│   └── ai/                           # Gemini adapter, prompt composer, EQ engine
├── Docs/
│   ├── 9_PARAMETER_ENQUIRY_MODEL.md  # Canonical parameter model specification
│   └── CHARACTER_SYSTEM.md           # Character architecture & admin API usage
└── README.md                         # You are here
```

---

## Getting Started

### Prerequisites

- **Node.js 20.x** or later  
- **pnpm 8.x** (preferred package manager)  
- Optional: **Vercel CLI** (for deployment)  
- Gemini API key (if you want live LLM responses instead of mock text)

### Install Dependencies

```bash
pnpm install
```

### Bootstrap Env Defaults (optional)

```bash
cp apps/questionnaire/.env.example apps/questionnaire/.env.local
```

Edit values as needed (see [Environment Configuration](#environment-configuration)).

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8082` | Port for the Express questionnaire service. |
| `QUESTIONNAIRE_WEBHOOK_URL` | _(unset)_ | Called with final payload after conversations complete. |
| `CHARACTER_REGISTRY_PATH` | `config/characters.json` | Absolute or relative path to character registry. |
| `ENABLE_EQ_ENGINE` | `true` | Enables empathy modulation using EQ rules. |
| `ENABLE_GUARDRAILS` | `true` | Enables guardrail sanitation (option stripping, tone enforcement). |
| `GEMINI_API_KEY` | _(required for live responses)_ | Pass-through key for Gemini client. |

All questionnaire-specific environment variables live inside `apps/questionnaire`.  
Core packages use configuration passed programmatically.

---

## Running the Questionnaire

### Local API + Test UI

```bash
cd apps/questionnaire
pnpm dev            # runs Express server on PORT (default 8082)
```

Open the bundled demo client:

```
http://localhost:8082/test-ui.html
```

This HTML file presents selectable service chips and chat interface identical to the Vercel demo.

### Using the REST API Directly

```bash
curl -X POST http://localhost:8082/questionnaires \
  -H "Content-Type: application/json" \
  -d '{"service":"residential_interiors","channel":"web"}'
```

Use the returned `questionnaireId` with `/questionnaires/{id}/messages` to continue a session.

---

## API Overview

| Method & Path | Description |
|---------------|-------------|
| `POST /questionnaires` | Start a new conversation; returns session state and first prompt. |
| `POST /questionnaires/{id}/messages` | Send the next user message; receives AI response and updated parameter progress. |
| `GET /questionnaires/{id}` | Inspect the current transcript and collected parameter map. |
| `POST /questionnaires/{id}/complete` | Force completion and emit webhook (used for admin/testing). |
| `GET /admin/characters` | List currently loaded characters. |
| `POST /admin/characters/reload` | Hot reload the character registry from disk. |
| `PATCH /admin/characters/{id}/tone` | Live-tweak tone/phrases (writes back to registry). |

> Full schema lives in `apps/questionnaire/openapi.yaml`.

---

## Conversation Lifecycle

Each service strictly follows the **9-Parameter Enquiry Model**:

1. **Affirm & Ask** – Character acknowledges previous reply, asks the next targeted question.  
2. **Validate** – Inputs are validated using parameter rules (choice lists, numeric bounds, follow-ups).  
3. **Guardrails** – Responses are sanitised to avoid option leakage or multi-question prompts.  
4. **EQ Modulation** – Emotional cues tweak affirmation style (calming vs. celebratory).  
5. **Completion** – When all parameters are filled, the engine returns a structured payload and triggers the webhook.

Detailed rationale and parameter design patterns are documented in `Docs/9_PARAMETER_ENQUIRY_MODEL.md`.

---

## Character & Prompt System

- Characters live in `apps/questionnaire/config/characters.json`.  
- A JSON Schema (`apps/questionnaire/config/character-registry.schema.json`) validates structure on boot and on hot reload.  
- Characters contain:
  - Persona, tone, empathy cues, guardrails
  - Prompt guidance per parameter (purpose, example questions, validation rules, emotion cues)
  - Routing (model, temperature) and language settings
- The loader (`packages/core/src/characters.ts`) supports file-based or in-memory initialisation and caches with mtime checks.
- Hot reload can be triggered via `POST /admin/characters/reload` without restarting the server.

---

## Extending the Platform

To add a new service:

1. **Define Parameters**  
   - Add a 9-element array under `serviceParameters` in `apps/questionnaire/src/parameters.ts`.
   - Stick to the parameter attribute convention (id, label, type, goal, options, expectedFormat, etc.).

2. **Create a Character**  
   - Add an entry in `apps/questionnaire/config/characters.json`.  
   - Provide persona, tone, guardrails, EQ detection, and per-parameter prompt guidance.

3. **Update Ecosystem Types**  
   - Append the new service to `packages/core/src/types.ts` and `packages/core/src/schemas.ts`.  
   - Update `apps/questionnaire/config/character-registry.schema.json` + root `config/character-registry.schema.json`.

4. **Expose in UI & Docs**  
   - Add a service button and trigger message in `apps/questionnaire/public/test-ui.html`.  
   - Document the service in `README.md` and `Docs/9_PARAMETER_ENQUIRY_MODEL.md`.

5. **Hot Reload**  
   - Run `POST /admin/characters/reload` or restart the questionnaire service to load your changes.

---

## Testing, Linting & Quality

Commands are executed from the repository root unless noted:

```bash
# Type-check & lint core packages
pnpm -r lint

# Run unit / integration tests (if configured inside workspaces)
pnpm -r test

# Format staged files
pnpm exec prettier --write .
```

The questionnaire app is intentionally simple (in-memory state) so you can wrap your own tests around the REST interface or integrate with Playwright for conversational smoke tests.

---

## Deployment Notes

- **Vercel** – The repository ships with `apps/questionnaire/vercel.json`. Deploy the `apps/questionnaire` workspace as a standalone serverless function.  
- **Custom Hosting** – Run `pnpm build && pnpm start` inside `apps/questionnaire` behind any Node-friendly server (PM2, Docker, etc.).  
- **State** – Sessions are ephemeral. For production, either override the store (`apps/questionnaire/src/models/Questionnaire.ts`) or rely on the webhook to persist results.

---

## Additional Documentation

- [Character System Reference](Docs/CHARACTER_SYSTEM.md)  
- [9 Parameter Enquiry Model](Docs/9_PARAMETER_ENQUIRY_MODEL.md)  
- [OpenAPI Specification](apps/questionnaire/openapi.yaml)  
- [Questionnaire Service README](apps/questionnaire/README_questionnaire.md)

---

**Have fun building delightful conversations that convert ambiguity into structured insight.**  
Questions or suggestions? Open an issue or start a discussion! 🚀
