# 🎭 Character-Aware Prompt System

## Overview

The Character-Aware Prompt System replaces hardcoded AI prompts with a dynamic, personality-driven approach. Each service consultant (Arvind for Construction, Aadhya for Interior Design, Riya for Home Automation, Manjunath for Painting) has a unique profile that shapes how the AI responds.

## 🎯 What This Solves

### Before (Problems)
- ❌ Generic, hardcoded prompts
- ❌ No personalization based on consultant
- ❌ No tone adaptation
- ❌ No guardrail enforcement
- ❌ Required code changes to update prompts

### After (Solutions)
- ✅ Dynamic prompts generated from character profiles
- ✅ Personalized responses per consultant
- ✅ Emotional intelligence (EQ) with tone modulation
- ✅ Automatic guardrail scanning and repair
- ✅ Hot reload - update characters without restarting

---

## 📁 Structure

```
config/
├── character-registry.schema.json    # JSON Schema for validation
└── characters.json                   # Character registry (editable)

packages/
├── core/src/characters.ts           # Character loader with hot reload
├── ai/src/
    ├── prompt-composer.ts           # Dynamic prompt generation
    ├── eq-engine.ts                 # Emotional intelligence engine
    └── guardrails.ts                # Safety & compliance enforcement

apps/api/src/routes/
└── admin.characters.ts              # Admin API for character management

tools/
└── gen-zod-types.ts                 # Zod type generator
```

---

## 🚀 Setup

### 1. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
cd "/Users/apple/Desktop/AI 1"
pnpm install
```

Required packages:
- `json-schema-to-zod` - Generate Zod types from JSON Schema
- `chokidar` - File watcher for hot reload
- `ajv` - JSON Schema validation

### 2. Generate Zod Types

```bash
pnpm gen:zod
```

This creates `packages/core/src/character-registry.zod.ts` with runtime type validation.

### 3. Build the Project

```bash
pnpm build
```

### 4. Start Services

The character registry automatically loads on startup and watches for changes.

**Terminal 1 - API Server:**
```bash
cd apps/api
pnpm dev
# Character registry watcher starts automatically
```

**Terminal 2 - Summarizer Worker:**
```bash
cd apps/workers/summarizer
pnpm dev
# Uses character-aware prompts
```

---

## 🎭 Character Registry

### File: `config/characters.json`

This file defines all consultant characters. Each character has:

#### Core Identity
- `id` - Unique identifier (e.g., `"arvind-construction"`)
- `name` - Display name (e.g., `"Vikram - Construction Expert"`)
- `service` - Service type (`construction`, `interior_design`, `home_automation`, `painting`)
- `active` - Whether this character is active (boolean)

#### Personality
- `persona` - Background and expertise description
- `qualification` - Professional credentials
- `tone` - Communication style

#### Regional Context
- `region.country` - Country (e.g., `"India"`)
- `region.state` - State (e.g., `"Maharashtra"`)
- `region.city` - City (e.g., `"Mumbai"`)

#### AI Configuration
- `routing.ai.model` - AI model to use
- `routing.ai.temperature` - Temperature (0.0-1.0)
- `routing.ai.maxTokens` - Max tokens per response

#### Prompts (Stage-Specific)
- `prompts.enquiry.fields` - Fields to collect
- `prompts.enquiry.style` - Collection style
- `prompts.summarizer.system` - Summary generation instructions
- `prompts.milestone.rules` - Milestone generation rules
- `prompts.milestone.notes` - Regional notes

#### Guardrails
- `guardrails` - Array of behavioral constraints

#### Emotional Intelligence (EQ)
- `eq.detection` - Keywords to detect emotional state
- `eq.empathyPhrases` - Empathy responses
- `eq.modulation` - Signal→Tone mapping

#### Language
- `language.primary` - Primary language
- `language.secondary` - Secondary languages
- `language.locale` - Locale code
- `language.openingPhrases` - Greeting options
- `language.closingPhrases` - Closing options

---

## 🔧 Admin API

### List All Characters

```bash
GET /admin/characters
```

**Response:**
```json
{
  "version": "1.0.0",
  "count": 3,
  "characters": [
    {
      "id": "arvind-construction",
      "name": "Vikram - Construction Expert",
      "service": "construction",
      "active": true,
      "region": { "country": "India", "state": "Maharashtra", "city": "Mumbai" },
      "tone": "Professional yet approachable"
    }
  ]
}
```

### Get Character by ID

```bash
GET /admin/characters/vikram-construction
```

Returns complete character configuration.

### Get Characters by Service

```bash
GET /admin/characters/service/construction
```

### Force Reload Registry

```bash
POST /admin/characters/reload
```

Forces immediate reload from disk. Use after manual file edits.

**Response:**
```json
{
  "ok": true,
  "version": "1.0.0",
  "reloadedAt": "2025-10-12T10:30:00Z",
  "characterCount": 3
}
```

### Update Character Tone (Runtime)

```bash
PATCH /admin/characters/arvind-construction/tone
Content-Type: application/json

{
  "tone": "friendly and concise",
  "empathyPhrases": ["We've got this.", "I'm here to help."],
  "openingPhrases": ["Hey! Vikram here.", "Hello! Let's get started."]
}
```

**Note:** This writes changes to `characters.json` file atomically.

### Update Character Guardrails

```bash
PATCH /admin/characters/arvind-construction/guardrails
Content-Type: application/json

{
  "guardrails": [
    "Always prioritize safety",
    "Transparent about costs",
    "Realistic timelines"
  ]
}
```

### Preview Character

```bash
GET /admin/characters/vikram-construction/preview?userName=John
```

**Response:**
```json
{
  "greeting": "Namaste! I'm Vikram. John",
  "tone": "Professional yet approachable",
  "persona": "Experienced civil engineer...",
  "sampleEmpathy": "I understand this is a significant investment.",
  "guardrails": ["Focus on safety...", "Transparent about costs..."]
}
```

---

## 🧠 How It Works

### 1. Prompt Composition

The `composeSystemPrompt()` function dynamically generates prompts based on character + stage:

```typescript
import { composeSystemPrompt } from '@tatvaops/ai';

// For summarizer
const systemPrompt = composeSystemPrompt('construction', 'summarizer');

// For enquiry conversation
const enquiryPrompt = composeSystemPrompt('interior_design', 'enquiry');

// For milestone generation
const milestonePrompt = composeSystemPrompt('home_automation', 'milestone');
```

Generated prompts include:
- Character role and identity
- Persona and qualifications
- Region-specific context
- Tone guidelines
- Guardrails (universal + character-specific)
- Stage-specific instructions

### 2. Emotional Intelligence (EQ)

The EQ engine detects user emotional signals and modulates responses:

```typescript
import { craftAssistantReply } from '@tatvaops/ai';

const userMessage = "I'm worried about the budget";
const baseResponse = "Let me provide an estimate...";

// EQ engine detects "worried" signal and adds empathy
const finalResponse = craftAssistantReply(character.eq, userMessage, baseResponse);
// Output: "I understand this is a significant investment.\n\nLet me provide an estimate..."
```

**Detection Signals:**
- `worried`, `urgent`, `confused`, `budget`, `delay`, `cheap`

**Tone Modulation:**
- `worried` → reassuring
- `urgent` → focused
- `confused` → patient
- `budget` → practical

### 3. Guardrail Enforcement

Automatic scanning and repair of policy violations:

```typescript
import { scan, repair } from '@tatvaops/ai';

const aiResponse = "Total cost is ₹2,50,000";

// Scan for violations
const violations = scan(aiResponse);
// Returns: ['pricing:exact']

// Repair violations
const safeResponse = repair(aiResponse, violations);
// Returns: "Total cost is a budget range based on materials..."
// + "Note: Exact pricing isn't provided at this stage..."
```

**Violation Types:**
- `pricing:exact` - Exact price mentions
- `legal:promise` - Approval guarantees
- `vendor:bias` - Brand favoritism
- `privacy:leak` - Sensitive data exposure
- `unsafe:advice` - Skipping safety/compliance
- `timeline:guarantee` - Deadline promises

### 4. Hot Reload

File watcher monitors `config/characters.json`:

```typescript
// Starts automatically in API server
startCharacterWatcher((info) => {
  logger.info(info, 'Characters hot-reloaded');
});
```

**When `characters.json` changes:**
1. Watcher detects file modification
2. Registry is reloaded and validated
3. All subsequent requests use new character config
4. **No server restart required!**

---

## 📝 Usage Examples

### Example 1: Add New Character

Edit `config/characters.json`:

```json
{
  "id": "priya-painting",
  "name": "Priya - Painting Expert",
  "service": "painting",
  "active": true,
  "persona": "Professional painter with 12+ years experience",
  "qualification": "Certified Master Painter",
  "tone": "Friendly and detail-oriented",
  "region": {
    "country": "India",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  "routing": {
    "ai": {}
  },
  "prompts": {
    "enquiry": {
      "fields": ["wallArea", "surfaces", "finish", "colors", "budget"],
      "style": "Ask about surface preparation and finish preferences"
    },
    "summarizer": {
      "system": "Analyze painting enquiries focusing on surface prep, finish quality, and timeline"
    }
  },
  "guardrails": [
    "Always recommend proper surface preparation",
    "Suggest eco-friendly paints when possible"
  ],
  "eq": {
    "detection": ["worried", "urgent", "quality"],
    "empathyPhrases": ["Quality is our priority!", "Let's get this right."],
    "modulation": {
      "worried": "reassuring",
      "quality": "detailed"
    }
  },
  "language": {
    "openingPhrases": ["Hi! I'm Priya, your painting expert."]
  }
}
```

**File saves → Hot reload triggers → New character active!**

### Example 2: Adjust Tone for Weekend

Update tone to be more casual:

```bash
curl -X PATCH http://localhost:3000/admin/characters/vikram-construction/tone \
  -H "Content-Type: application/json" \
  -d '{
    "tone": "casual and friendly",
    "openingPhrases": ["Hey! Vikram here, happy weekend!", "Hi there! Let's chat about your project."]
  }'
```

### Example 3: Add Regional Guardrail

For monsoon season in Mumbai:

```bash
curl -X PATCH http://localhost:3000/admin/characters/vikram-construction/guardrails \
  -H "Content-Type: application/json" \
  -d '{
    "guardrails": [
      "Focus on safety and compliance",
      "Transparent about costs",
      "Account for monsoon delays (June-September)",
      "Recommend waterproofing for all projects"
    ]
  }'
```

### Example 4: Test Before Deploying

```bash
# Preview how character will greet users
curl "http://localhost:3000/admin/characters/aadhya-interior/preview?userName=Sarah"

# Check guardrail enforcement
npm test qa/specs/ai/guardrails.test.ts

# Test hot reload
npm test qa/specs/characters/hotreload.test.ts
```

---

## 🛠️ Troubleshooting

### Character Not Loading

**Symptoms:** `No active character found for service: X`

**Solutions:**
1. Check `characters.json` syntax (run `pnpm gen:zod` to validate)
2. Ensure `active: true` for at least one character per service
3. Check logs for validation errors
4. Force reload: `curl -X POST http://localhost:3000/admin/characters/reload`

### Hot Reload Not Working

**Symptoms:** Changes to `characters.json` not reflected

**Solutions:**
1. Check API server logs for watcher errors
2. Verify file permissions on `config/characters.json`
3. Manual reload: `POST /admin/characters/reload`
4. Restart API server if watcher crashed

### Guardrails Too Aggressive

**Symptoms:** Valid responses being flagged

**Solutions:**
1. Review `packages/ai/src/guardrails.ts` patterns
2. Adjust regex patterns for your use case
3. Whitelist specific phrases in repair logic
4. Use `validate()` to check before `repair()`

### EQ Not Detecting Signals

**Symptoms:** No empathy being added

**Solutions:**
1. Check `eq.detection` array in character config
2. Verify signals are lowercase in detection array
3. Test with `detectSignal()` function directly
4. Add more detection keywords

---

## 📊 Monitoring

### Character Usage Metrics

Track which characters are being used:

```typescript
// In logger, add character context
logger.info({
  characterId: character.id,
  characterName: character.name,
  service: character.service
}, 'Using character for request');
```

### Guardrail Violations

Monitor violations in logs:

```typescript
if (violations.length > 0) {
  logger.warn({
    violations,
    enquiryId,
    service
  }, 'Guardrail violations detected');
}
```

### Hot Reload Events

Track reload frequency:

```typescript
startCharacterWatcher((info) => {
  logger.info({
    reason: info.reason,
    timestamp: info.timestamp
  }, 'Character registry reloaded');
});
```

---

## 🎓 Best Practices

### 1. Character Design
- ✅ Give characters distinct personalities
- ✅ Use region-specific context
- ✅ Define clear guardrails
- ✅ Add emotional intelligence keywords
- ❌ Don't make all characters sound the same

### 2. Prompt Engineering
- ✅ Use character persona in prompts
- ✅ Leverage regional notes
- ✅ Test different tones
- ❌ Don't bypass character system

### 3. Guardrails
- ✅ Review violations regularly
- ✅ Update patterns as needed
- ✅ Test edge cases
- ❌ Don't disable guardrails in production

### 4. Hot Reload
- ✅ Test changes in preview first
- ✅ Use atomic writes (edit → save)
- ✅ Monitor reload events
- ❌ Don't edit file while server is writing

### 5. Testing
- ✅ Run `npm test` after character changes
- ✅ Test with real user inputs
- ✅ Verify guardrails catch violations
- ❌ Don't deploy without testing

---

## 🔐 Security Notes

- Character files should be in `.gitignore` if they contain sensitive info
- Admin endpoints should be protected (add auth middleware)
- Hot reload is powerful - restrict file write access
- Guardrails are enforced post-generation - test thoroughly
- PII in characters (if any) should be masked in logs

---

## 📚 Next Steps

Once you have the basic system working:

1. **Expand Character Library**: Add more consultants per service
2. **A/B Testing**: Test different personas for same service
3. **Multilingual Support**: Add Hindi/regional language characters
4. **Advanced EQ**: More sophisticated emotional detection
5. **Custom Guardrails**: Service-specific violation types
6. **Analytics Dashboard**: Track character performance

---

## 🆘 Support

**For issues:**
- Check logs in terminal outputs
- Review `qa/reports/` for test results
- Validate `characters.json` schema
- Run `pnpm gen:zod` to regenerate types

**For questions:**
- See `ARCHITECTURE.md` for system design
- Review test files in `qa/specs/`
- Check inline code comments

---

**System is ready! The user will provide detailed characterizations next.** 🎭

