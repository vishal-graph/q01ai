# Changelog

## [1.0.0] - 2024-10-25

### 🎯 **Questionnaire-Only Architecture**
- **BREAKING CHANGE**: Converted to questionnaire-only system
- Removed all Summarizer and Milestoner services and dependencies
- Eliminated MongoDB, RabbitMQ, and Redis dependencies
- Purged all summary/milestone related code, configs, and infrastructure

### ✨ **New Features**
- **Standalone Questionnaire Service** (`apps/questionnaire`)
  - 9-parameter collection engine for all 4 services
  - Empathetic AI responses with acceptance of any user input
  - Character-based conversations with EQ tone adaptation
  - In-memory session storage for plug-and-play deployment
  - Optional completion webhook for external integration

### 🏗️ **Service Coverage**
- **Interior Design** (Aadhya Rao) - 9 parameters with style preferences, budget, timeline
- **Construction** (Arvind Narayan) - 9 parameters with plot details, approvals, structure
- **Home Automation** (Riya Mehta) - 9 parameters with automation focus, ecosystem preferences
- **Painting** (Manjunath Gowda) - 9 parameters with surface conditions, color themes, finishes

### 🎨 **User Experience**
- **Expected Answer Guidance** - Clear format hints for all parameters
- **Media Upload Support** - Unified file upload for all questions (PNG, JPEG, PDF)
- **Empathetic AI** - Accepts any response with affirmation and empathy
- **Completion Popup** - Professional ending with consultant follow-up message
- **No Validation** - Flexible input acceptance for better user experience

### 🔧 **Technical Improvements**
- **Direct Gemini API Integration** - Replaced Vertex AI with direct API key
- **Modular Architecture** - Plug-and-play questionnaire service
- **Clean Codebase** - Removed all unused dependencies and files
- **TypeScript Support** - Full type safety across all components
- **Hot Reload** - Character configuration updates without restart

### 📚 **Documentation**
- Updated README with questionnaire-only setup
- Added questionnaire-specific documentation
- Cleaned up all references to purged services
