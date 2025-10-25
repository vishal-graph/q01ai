# 9-Parameter Enquiry Model - Complete Documentation

## 🎯 Overview

The **9-Parameter Enquiry Model** is a structured, conversational approach to collecting project information. Instead of asking users to fill forms or provide unstructured text, AI characters engage in natural conversation, asking **9 key questions** specific to each service.

**Key Principle:** The conversational parameter collection **IS** the enquiry itself. There's no separate "create enquiry" step.

---

## 🏗️ Architecture

### Flow

```
User selects service → AI Character greets user → Asks Question 1 
→ User answers → AI validates & asks Question 2 → ... 
→ All 9 parameters collected → Enquiry auto-submitted 
→ Summary & Milestones generated
```

### Components

1. **Character Configuration** (`config/characters.json`)
   - Each character has `prompts.enquiry.parameters[]` array
   - Each parameter has 9 attributes (see below)

2. **Prompt Composer** (`packages/ai/src/prompt-composer.ts`)
   - Reads parameters from character config
   - Builds detailed AI prompt with all parameter guidance
   - Instructs AI to ask questions one by one

3. **Chat API** (`apps/api/src/routes/chat.ts`)
   - Manages conversation sessions
   - Tracks collected parameters
   - Provides progress feedback

4. **Chat UI** (`test-ui/src/ChatInterface.tsx`)
   - Real-time chat interface
   - Progress bar showing collection status
   - Auto-submission when complete

---

## 📋 The 9 Parameter Attributes

Each parameter in the model has these attributes:

### 1️⃣ **ID** (`id`)
Unique identifier for the parameter (e.g., `"plotSize"`, `"budgetRange"`)

### 2️⃣ **Label** (`label`)
Human-readable name (e.g., `"Plot Size"`, `"Budget Range (₹)"`)

### 3️⃣ **Purpose** (`purpose`)
Why this parameter is important
- Example: *"Foundation & scope estimation - determines structural load, BOQ calculations"*

### 4️⃣ **Question Intent** (`questionIntent`)
Semantic goal of asking this question
- Example: *"Understand the physical dimensions and area available for construction"*

### 5️⃣ **AI Guidance** (`aiGuidance`)
Instructions for how the AI should phrase and handle this parameter
- Example: *"Ask naturally about plot dimensions. Accept sqft, acres, or dimensions. Validate reasonableness."*

### 6️⃣ **Example Questions** (`exampleQuestions`)
Array of varied question phrasings
```json
[
  "Can you share the plot size — in square feet or dimensions if you have them?",
  "What's the total area of your plot?",
  "Could you tell me the plot size? Even approximate dimensions work for now."
]
```

### 7️⃣ **Response Type** (`responseType`)
Expected data type: `text`, `number`, `boolean`, `choice`, `file`, `media`

### 8️⃣ **Validation & Follow-ups** (`validation`)
- **Rules**: Validation constraints
- **Follow-ups**: Context-aware responses based on answer
```json
{
  "rules": ["Must be > 0", "Typical residential: 1200-10000 sqft"],
  "followUps": [
    "If < 1000 sqft: 'That's a compact plot — perfect for efficient design.'",
    "If > 10000 sqft: 'Substantial plot! We can plan beautiful layout with open space.'"
  ]
}
```

### 9️⃣ **Emotion Cues** (`emotionCues`)
Map of detected emotions to tone modulation
```json
{
  "uncertain": "reassuring",
  "proud": "celebratory",
  "anxious": "simplifying"
}
```

### Bonus: **Usage in Process** (`usageInProcess`)
How this parameter is used downstream
- Example: *"Used in: BOQ estimation, foundation planning, milestone duration calculation"*

---

## 🎨 Service-Specific Parameters

### Construction (Arvind Narayan)
1. Plot Size
2. Plot Type / Zone
3. Approval Status
4. Soil Test Status
5. Number of Floors
6. Structure Type
7. Construction Stage
8. Timeline (months)
9. Budget Range (₹)

### Interior Design (Aadhya Rao)
1. Space Type
2. Area (sqft)
3. BHK / Room Count
4. Style Preference
5. Budget Range (₹)
6. Timeline (days/weeks)
7. Floor Plan Availability
8. Special Zones / Focus Areas
9. Inspirations / Moodboard

### Home Automation (Riya Mehta)
1. Home Type
2. Automation Focus
3. Rooms to Automate
4. Power Backup / Inverter
5. Wi-Fi / Network Strength
6. Ecosystem Preference
7. Security Priority
8. Budget Tier
9. Family Lifestyle Patterns

### Painting (Manjunath Gowda)
1. Property Type
2. Interior or Exterior
3. Surface Condition
4. Old Paint Type
5. Colour Theme / Intent
6. Finish Preference
7. Total Area (sqft)
8. Timeline (days)
9. Budget / Brand Flexibility

---

## 🤖 AI Behavior Logic

### Collection Strategy

The AI follows this logic:

1. **Maintain Parameter State**: Track which parameters are collected vs. missing
2. **Dynamic Question Selection**: Choose next question based on:
   - Missing parameters
   - Conversation context
   - User's emotional state
3. **Ask ONE Question at a Time**: Never overwhelm with multiple questions
4. **Validate Inline**: 
   - Affirm good answers: *"Perfect! That helps us plan better."*
   - Clarify vague answers: *"Could you give me an approximate number?"*
5. **Mark as Collected**: Track internally which parameters are complete
6. **Adapt Tone**: Use EQ signals to modulate response tone
7. **Stop When Complete**: Once all 9 are collected, summarize and confirm

### Example Conversation Flow

**User**: "I want to build a house"

**AI (Arvind)**: "Hello! I'm Arvind, and I'm here to help with your construction project. Can you share the plot size — in square feet or dimensions if you have them?"

**User**: "It's about 2400 sqft"

**AI**: "Perfect! That's a good-sized plot. Is this BBMP or DTCP area, or is it a private site?"

**User**: "BBMP area"

**AI**: "Great — BBMP has clear guidelines. We'll ensure all approvals are in place. Have you received plan sanction from the local authority?"

... *continues until all 9 parameters collected*

**AI**: "Excellent! I've gathered all the key details about your project. Let me summarize:
- Plot: 2400 sqft, BBMP area
- Floors: 2-storey residential
- Budget: 40-45 lakhs
- Timeline: 12 months
... 
Your enquiry is now complete! Our team will analyze this and generate a detailed project plan."

---

## 💻 Implementation Details

### Character Configuration

```json
{
  "prompts": {
    "enquiry": {
      "collectionFlow": "Your goal is to collect all 9 key project parameters through natural conversation. For each missing parameter: (1) Generate 1 question in your character tone, (2) Wait for user's reply, (3) Validate inline, (4) Mark as collected, (5) Move to next. Once all 9 are captured, summarize as JSON and confirm.",
      "parameters": [
        {
          "id": "plotSize",
          "label": "Plot Size",
          "purpose": "Foundation & scope estimation",
          "questionIntent": "Understand physical dimensions",
          "aiGuidance": "Ask naturally. Accept sqft/acres/dimensions.",
          "exampleQuestions": ["Can you share the plot size?"],
          "responseType": "number",
          "validation": {
            "rules": ["Must be > 0"],
            "followUps": ["If unclear: 'Even approximate dimensions help'"]
          },
          "emotionCues": {
            "uncertain": "reassuring"
          },
          "usageInProcess": "BOQ estimation, foundation planning"
        }
        // ... 8 more parameters
      ]
    }
  }
}
```

### API Endpoint

**POST `/api/chat`**

Request:
```json
{
  "service": "construction",
  "message": "I want to build a house",
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "sessionId": "session-abc123",
  "message": "Hello! I'm Arvind. Can you share the plot size?",
  "collectedParameters": {
    "plotSize": 2400
  },
  "progress": {
    "collected": 1,
    "total": 9,
    "percentage": 11,
    "isComplete": false
  },
  "characterName": "Arvind Narayan",
  "messagesCount": 2
}
```

---

## 🎨 UI Integration

### ChatInterface Component

```tsx
<ChatInterface
  service="construction"
  characterName="Arvind Narayan"
  onComplete={(sessionId, parameters) => {
    // All 9 parameters collected!
    console.log('Collected:', parameters)
    // Auto-submit enquiry
    submitEnquiry(sessionId, parameters)
  }}
/>
```

### Features
- Real-time chat bubbles
- Progress bar (X/9 parameters collected)
- Typing indicator
- Auto-scroll
- Parameter summary on completion

---

## 🚀 Benefits

### For Users
- ✅ Natural conversation (no forms!)
- ✅ Guided step-by-step
- ✅ Immediate validation
- ✅ Emotionally adaptive responses
- ✅ Clear progress tracking

### For Business
- ✅ Higher completion rates
- ✅ Better data quality
- ✅ Structured information
- ✅ Reduced support queries
- ✅ Automated downstream processing

### For AI
- ✅ Clear collection strategy
- ✅ Validation rules
- ✅ Context-aware responses
- ✅ Emotional intelligence
- ✅ Consistent behavior across services

---

## 📊 Metrics & Analytics

Track these metrics:

- **Completion Rate**: % of conversations that collect all 9 parameters
- **Average Time to Complete**: How long it takes to gather all info
- **Drop-off Points**: Which parameter causes most abandonment
- **Clarification Rate**: How often AI needs to re-ask questions
- **User Satisfaction**: Post-conversation feedback

---

## 🔮 Future Enhancements

1. **Multi-language Support**: Ask questions in Hindi, Kannada, etc.
2. **Voice Input**: Speak answers instead of typing
3. **Image Upload**: Share photos for visual parameters
4. **Smart Defaults**: Pre-fill based on user history
5. **Progressive Disclosure**: Ask follow-up questions based on answers
6. **A/B Testing**: Test different question phrasings
7. **ML-based Extraction**: Auto-extract parameters from free-form text

---

## 📚 Related Documentation

- [Character System](./CHARACTER_SYSTEM.md)
- [AI Model Configuration](./AI_MODEL_UPDATE_SUMMARY.md)
- [API Routes](./TESTING_WITH_POSTMAN.md)
- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md)

---

## 🎓 Training the AI

The AI learns from:
1. **Parameter Guidance**: Detailed instructions in each parameter
2. **Example Questions**: Multiple phrasing variations
3. **Validation Rules**: What constitutes a valid answer
4. **Follow-up Scripts**: How to handle different scenarios
5. **Emotion Cues**: When to adapt tone
6. **Character Persona**: Overall communication style

---

## ✨ Best Practices

### For Parameter Design
- Keep questions simple and focused
- Provide multiple example phrasings
- Include validation rules
- Add context-aware follow-ups
- Consider emotional states

### For AI Prompting
- Be explicit about collection strategy
- Provide clear validation criteria
- Include tone modulation guidance
- Emphasize one-question-at-a-time
- Specify completion behavior

### For UI/UX
- Show progress clearly
- Provide visual feedback
- Allow editing previous answers
- Display collected parameters
- Celebrate completion

---

**Last Updated**: October 18, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready

