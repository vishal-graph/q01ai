import { serviceParameters, Param } from './parameters';
import { smartRepair } from '../../../packages/ai/src/index';
import { detectSignal, pickEmpathyLine } from '../../../packages/ai/src/index';

// Pure in-memory questionnaire engine - plug-and-play, no external storage

export function getNextParamId(service: string, collected: Record<string, any>): string | null {
  const params = serviceParameters[service] || [];
  if (process.env.NODE_ENV !== 'production') {
    console.log('[debug] evaluating missing params for service', service);
    params.forEach(p => {
      console.log('   -', p.id, '=>', collected[p.id]);
    });
  }
  const missing = params.find(p => collected[p.id] === undefined || collected[p.id] === null);
  return missing ? missing.id : null;
}

export function getParamMeta(service: string, id: string): Param | undefined {
  return (serviceParameters[service] || []).find(p => p.id === id);
}

export function extractParamValue(service: string, paramId: string, userText: string): any | undefined {
  const text = (userText || '').toLowerCase().trim();
  if (!text) return undefined;

  // For now, only extract values for known parameters.
  // This prevents premature completion for services where extractParamValue doesn't have explicit logic.
  // In a real-world scenario, you'd add specific regex/NLP for each parameter.
  switch (service) {
    case 'interior_design':
    case 'construction':
    case 'home_automation':
    case 'painting':
    case 'solar_services':
    case 'electrical_services':
    case 'irrigation_automation':
    case 'event_management':
      switch (paramId) {
        case 'spaceType': {
          const m = text.match(/(home|house|apartment|flat|villa|office|retail|shop|business|commercial)/i);
          return m ? m[1].toLowerCase() : userText;
        }
        case 'areaSqft':
        case 'totalAreaSqft':
        case 'availableRoofAreaSqft': {
          const m = text.match(/(\d{3,6})\s*(sq\s*ft|square\s*feet|sq\s*m|m2|yards?|yds?)/i);
          return m ? parseInt(m[1], 10) : userText;
        }
        case 'bhkRoomCount': {
          const m1 = text.match(/(\d)\s*bhk/i);
          const m2 = text.match(/(\d)\s*bedroom/i);
          if (m1) return parseInt(m1[1], 10);
          if (m2) return parseInt(m2[1], 10);
          return userText;
        }
        case 'stylePreference': {
          if (/(modern|contemporary|minimalist|scandinavian)/i.test(text)) return 'Modern';
          if (/(european|classic|traditional|vintage)/i.test(text)) return 'European/Classic';
          if (/(cozy|warm|rustic|bohemian)/i.test(text)) return 'Cozy & Classic';
          if (/(luxury|premium|high-end)/i.test(text)) return 'Luxury';
          return userText;
        }
        case 'floorPlanAvailability': {
          if (/(yes|have|available|ready)/i.test(text)) return 'Yes';
          if (/(no|don't have|dont have|not available)/i.test(text)) return 'No';
          if (/(later|will share|ill share|share later)/i.test(text)) return 'I\'ll share later';
          return userText;
        }
        case 'timeline':
        case 'installationTimeline': {
          const m1 = text.match(/(\d{1,2})\s*months?/i);
          const m2 = text.match(/(\d{1,2})\s*weeks?/i);
          if (m1) return `${m1[1]} months`;
          if (m2) return `${m2[1]} weeks`;
          if (/(flexible|no rush|whenever)/i.test(text)) return 'Flexible';
          return userText;
        }
        case 'propertyType': {
          const m = text.match(/(house|apartment|business)/i);
          return m ? m[1].toLowerCase() : userText;
        }
        case 'desiredSolarType': {
          const m = text.match(/(on-grid|hybrid|off-grid)/i);
          return m ? m[1].toLowerCase() : userText;
        }
        case 'backupRequirement':
        case 'interestedInSubsidy': {
          // Normalize solar to string options; for others, allow boolean parsing
          if (service === 'solar_services') {
            return userText;
          }
          if (/(yes|true|yep)/i.test(text)) return true;
          if (/(no|false|nope)/i.test(text)) return false;
          return userText;
        }
        case 'automationFocus': {
          const optionsMap = [
            { key: 'lighting & ambience', label: 'Lighting & Ambience' },
            { key: 'security & safety', label: 'Security & Safety' },
            { key: 'climate & energy', label: 'Climate & Energy' },
            { key: 'entertainment & media', label: 'Entertainment & Media' },
            { key: 'whole home suite', label: 'Whole Home Suite' },
            { key: 'not sure', label: 'Not Sure' },
          ];

          const matches = optionsMap.filter(opt => text.includes(opt.key));
          if (matches.length > 0) {
            const unique = Array.from(new Set(matches.map(m => m.label)));
            return unique.length === 1 ? unique[0] : unique;
          }

          if (text.includes(',') || text.includes(' and ')) {
            const parts = text
              .split(/,|\band\b/)
              .map(p => p.trim())
              .filter(Boolean);
            if (parts.length > 1) {
              const normalized = parts
                .map(part => {
                  const lower = part.toLowerCase();
                  const found = optionsMap.find(opt => lower.includes(opt.key));
                  return found ? found.label : part;
                })
                .filter(Boolean);
              if (normalized.length) {
                const unique = Array.from(new Set(normalized));
                return unique.length === 1 ? unique[0] : unique;
              }
            }
          }

          return userText;
        }
        case 'roomsToAutomate': {
          const m = text.match(/(living|bedroom|kitchen|entire|specific|all)/i);
          return m ? userText : userText;
        }
        // For all other parameters (MCQs), accept the user's text as-is.
        // The UI sends the exact option value, so we can trust it.
        default:
          return userText;
      }
    default:
      return undefined; // If service is not recognized, don't extract anything
  }
}

export function sanitizeAssistant(text: string): string {
  return String(text)
    .replace(/(^|[\n\r])\s*(assistant|user)\s*[:\-–—]\s*/gi, (_m, p1) => p1)
    .replace(/\bassistant\s*:\s*/gi, '')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function applyGuardrails(text: string): string {
  const { repaired } = smartRepair(text);
  return repaired;
}

export function applyEQIfAny(character: any, userText: string, base: string): string {
  const eq = character.eq || {};
  const signal = detectSignal(eq, userText || '');
  const empathy = pickEmpathyLine(eq, signal);
  const parts: string[] = [];
  if (empathy) parts.push(empathy);
  parts.push(base);
  return parts.join('\n\n');
}

export function stripOptionPhrases(text: string, options?: string[]): string {
  if (!text) return '';
  let cleaned = String(text);

  // Remove inline "(Options: ...)" or "(Choices: ...)" segments
  cleaned = cleaned.replace(/\s*\((?:options?|choices?)\s*:[^)]*\)\s*[\.\u3002]?/gi, ' ');

  const optionList = Array.isArray(options)
    ? options.map((opt) => opt.toLowerCase().trim()).filter(Boolean)
    : [];

  const filteredLines = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();

      if (
        lower.startsWith('options:') ||
        lower.startsWith('option:') ||
        lower.startsWith('options include') ||
        lower.startsWith('choices:') ||
        lower.startsWith('choices include') ||
        lower.startsWith('choose from:') ||
        lower.startsWith('select from:') ||
        lower.startsWith('available options')
      ) {
        return false;
      }

      if (/^(?:options?|choices?)\s*(?:include|are)\b/.test(lower)) {
        return false;
      }

      // Remove lines that exactly match one of the options (with common bullet markers)
      if (
        optionList.length > 0 &&
        optionList.some((opt) => {
          const normalizedLine = lower.replace(/^[\d•\-]+\s*/, '').replace(/[.!]$/, '').trim();
          return normalizedLine === opt;
        })
      ) {
        return false;
      }

      // Remove lines that list multiple options separated by delimiters
      if (
        optionList.length > 0 &&
        optionList.every((opt) => lower.includes(opt)) &&
        (/[|,\/]/.test(lower) || /\b(and|or)\b/.test(lower))
      ) {
        return false;
      }

      return true;
    });

  let joined = filteredLines.join('\n').replace(/\s{2,}/g, ' ').trim();
  if (!joined.length) {
    joined = cleaned.trim();
  }

  if (optionList.length > 0 && joined) {
    optionList.forEach((opt) => {
      const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`\\s*\\|\\s*${escaped}`, 'gi'),
        new RegExp(`\\s*,\\s*${escaped}`, 'gi'),
        new RegExp(`\\s*/\\s*${escaped}`, 'gi'),
        new RegExp(`\\b(?:and|or)\\s+${escaped}`, 'gi'),
      ];
      patterns.forEach((pattern) => {
        joined = joined.replace(pattern, ' ');
      });
    });

    // Remove trailing segments that still look like option listings (pipes without text)
    joined = joined.replace(/\|\s*(?:\)|$)/g, ' ');
    joined = joined.replace(/\(\s*(?:\)|$)/g, ' ');
  }

  return joined.replace(/\s{2,}/g, ' ').replace(/\s+([?.!,;:])/g, '$1').trim();
}


