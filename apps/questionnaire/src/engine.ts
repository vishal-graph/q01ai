import { serviceParameters, Param } from './parameters';
import { smartRepair } from '@tatvaops/ai';
import { detectSignal, pickEmpathyLine } from '@tatvaops/ai';

// Pure in-memory questionnaire engine - plug-and-play, no external storage

export function getNextParamId(service: string, collected: Record<string, any>): string | null {
  const params = serviceParameters[service] || [];
  const missing = params.find(p => collected[p.id] === undefined || collected[p.id] === null);
  return missing ? missing.id : null;
}

export function getParamMeta(service: string, id: string): Param | undefined {
  return (serviceParameters[service] || []).find(p => p.id === id);
}

export function extractParamValue(_service: string, paramId: string, userText: string): any | undefined {
  const text = (userText || '').toLowerCase().trim();
  
  // If user provided any input, accept it and move on
  if (text && text.length > 0) {
    // Special handling for specific parameters
    switch (paramId) {
      case 'spaceType': {
        const m = text.match(/(home|house|apartment|flat|villa|office|retail|shop)/i);
        return m ? m[1].toLowerCase() : userText;
      }
      case 'areaSqft':
      case 'totalAreaSqft': {
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
        // Extract style preferences but accept any input
        if (/(modern|contemporary|minimalist|scandinavian)/i.test(text)) return 'Modern';
        if (/(european|classic|traditional|vintage)/i.test(text)) return 'European/Classic';
        if (/(cozy|warm|rustic|bohemian)/i.test(text)) return 'Cozy & Classic';
        if (/(luxury|premium|high-end)/i.test(text)) return 'Luxury';
        return userText;
      }
      case 'floorPlanAvailability': {
        // Accept yes/no/later variations
        if (/(yes|have|available|ready)/i.test(text)) return 'Yes';
        if (/(no|don't have|dont have|not available)/i.test(text)) return 'No';
        if (/(later|will share|ill share|share later)/i.test(text)) return 'I\'ll share later';
        return userText;
      }
      case 'timeline': {
        const m1 = text.match(/(\d{1,2})\s*months?/i);
        const m2 = text.match(/(\d{1,2})\s*weeks?/i);
        if (m1) return `${m1[1]} months`;
        if (m2) return `${m2[1]} weeks`;
        if (/(flexible|no rush|whenever)/i.test(text)) return 'Flexible';
        return userText;
      }
      default:
        // Accept any input for all other parameters
        return userText;
    }
  }
  
  return undefined;
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


