/**
 * Summary Generator - Generates structured 6-section summary from collected parameters
 */

import { geminiAPIClient } from '@tatvaops/ai';
import { serviceParameters } from './parameters';
import { QuestionnaireDoc, SixPointSummary } from './models/Questionnaire';

export interface ProjectSummary {
  projectOverview: string;
  scopeOfWork: string;
  clientRequirements: string;
  technicalSpecs: string;
  timeline: string;
  specialConsiderations: string;
  estimatedScope: string;
  /** One clear line: what to do first to initiate the project (call client, site visit, proposal, etc.) */
  initiationNextStep?: string;
}

const serviceDisplayNames: Record<string, string> = {
  residential_interiors: 'Residential Interiors',
  commercial_interiors: 'Commercial Interiors & Fit-Out',
  commercial_construction: 'Commercial Construction',
  property_development: 'Property Development',
  residential_construction: 'Residential Construction',
  home_automation: 'Home Automation',
  painting: 'Painting & Finishes',
  solar_services: 'Solar Services',
  electrical_services: 'Electrical Services',
  irrigation_automation: 'Irrigation Automation',
  event_management: 'Event Management',
  farm_infrastructure: 'Farm Infrastructure',
  plumbing_services: 'Plumbing Services',
};

const paramLabelMap: Record<string, string> = {
  project_type: 'Project type',
  rooms: 'Rooms / BHK',
  size_sqft: 'Area (sqft)',
  style: 'Style',
  budget: 'Budget',
  timeline: 'Timeline',
  contact_pref: 'Contact preference',
  callback_time: 'Callback time',
  must_haves: 'Must-haves',
  avoid: 'Avoid',
  notes: 'Notes',
  site_ready: 'Site ready',
  moodboard_refs: 'Moodboard refs',
  preferred_start: 'Preferred start',
};

export async function generateProjectSummary(
  service: string,
  parameters: Record<string, string>
): Promise<ProjectSummary> {
  const serviceName = serviceDisplayNames[service] || service.replace(/_/g, ' ');
  const params = serviceParameters[service] || [];

  const paramSummary = Object.entries(parameters)
    .map(([key, value]) => {
      const label = paramLabelMap[key] || params.find(p => p.id === key)?.label || key.replace(/_/g, ' ');
      return `- ${label}: ${value}`;
    })
    .join('\n');

  const systemPrompt = `You are a project consultant. Create a CLEAR, CONCISE, project-initiation-ready summary from the collected parameters. This summary will be used to START the project – no fluff, only actionable points.

COLLECTED PARAMETERS:
${paramSummary}

SERVICE: ${serviceName}

Generate a JSON with exactly 8 fields. Each field must be 1-2 SHORT lines (or bullet points). Be direct and on-point.

1. "projectOverview": One line. Type + size + style. Example: "3BHK villa, 4800 sqft, Japandi style renovation."

2. "scopeOfWork": One line. What we will do. Example: "Interior design, key rooms (kids room, home office, theatre, pool area), execution and finishing."

3. "clientRequirements": One line. Must-haves and preferences. Example: "Kids room, home office, pool, theatre room. Vastu: Telugu panchangam. No specific storage preference yet."

4. "technicalSpecs": One line. Materials, finishes, or "Standard as per scope" if not specified.

5. "timeline": One line. Example: "3 months" or "As discussed: 3 months."

6. "specialConsiderations": One line. Vastu, site status, renovation note, or "None."

7. "estimatedScope": One line. Format: "Area: X | Budget: Y | Complexity: Low/Medium/High."

8. "initiationNextStep": ONE clear action line – what to do first to initiate the project. Examples:
   - "Call client tomorrow 5 PM. Send proposal for 5L budget within 3 days."
   - "Schedule site visit. Prepare quote for 5L, 3-month timeline."
   Use callback_time and contact_pref from parameters. Be specific and actionable.

Rules: No filler. No "we will ensure" or "as per client". Just facts and one clear next step. Return JSON only.`;

  try {
    const response = await geminiAPIClient.generateText({
      model: 'gemini-2.5-flash',
      system: systemPrompt,
      user: 'Generate the project summary JSON based on the parameters provided.',
      temperature: 0.3,
    });

    const responseText = String(response.data);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to parse as JSON; fill any missing fields from parameters so we don't show "--"
    try {
      const parsed = JSON.parse(jsonStr);
      const timelineFromParams =
        parameters.timeline || parameters.timelineExpectation || parameters.installationTimeline || parameters.accessTimeline || '';
      const budgetFromParams =
        parameters.budgetRange || parameters.budget || parameters.budgetTier || parameters.budgetBrandFlexibility || '';
      const areaFromParams =
        parameters.areaSqft || parameters.size_sqft || parameters.carpetAreaSqft || parameters.builtUpAreaSqft ||
        parameters.totalAreaSqft || parameters.availableRoofAreaSqft || parameters.plotSize || '';
      const callbackTime = parameters.callback_time || '';
      const contactPref = parameters.contact_pref || 'phone';
      const defaultNextStep =
        callbackTime && contactPref
          ? `Call client ${callbackTime} via ${contactPref}. Prepare proposal per budget and timeline.`
          : `Follow up via ${contactPref}. Prepare proposal per budget and timeline.`;

      return {
        projectOverview: parsed.projectOverview || `${serviceName} project`,
        scopeOfWork: parsed.scopeOfWork || '--',
        clientRequirements: parsed.clientRequirements || '--',
        technicalSpecs: parsed.technicalSpecs || '--',
        timeline: parsed.timeline || timelineFromParams || '--',
        specialConsiderations: parsed.specialConsiderations || '--',
        estimatedScope:
          parsed.estimatedScope ||
          [areaFromParams && `Size: ${areaFromParams}`, budgetFromParams && `Budget: ${budgetFromParams}`].filter(Boolean).join(' | ') ||
          '--',
        initiationNextStep: parsed.initiationNextStep || defaultNextStep,
      };
    } catch {
      // If JSON parsing fails, try to extract sections manually
      return extractSectionsFromText(responseText, parameters, serviceName);
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    // Return a fallback summary based on parameters
    return generateFallbackSummary(service, parameters);
  }
}

function extractSectionsFromText(
  text: string,
  parameters: Record<string, string>,
  serviceName: string
): ProjectSummary {
  // Fallback extraction if JSON parsing fails
  const extractSection = (label: string): string => {
    const regex = new RegExp(`"?${label}"?\\s*[:\"]\\s*"?([^"\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '--';
  };

  const callbackTime = parameters.callback_time || '';
  const contactPref = parameters.contact_pref || 'phone';
  const defaultNextStep = callbackTime
    ? `Call client ${callbackTime} via ${contactPref}. Prepare proposal per budget and timeline.`
    : `Follow up via ${contactPref}. Prepare proposal per budget and timeline.`;

  return {
    projectOverview: extractSection('projectOverview') || `${serviceName} project`,
    scopeOfWork: extractSection('scopeOfWork') || '--',
    clientRequirements: extractSection('clientRequirements') || '--',
    technicalSpecs: extractSection('technicalSpecs') || '--',
    timeline: extractSection('timeline') || parameters.timeline || parameters.timelineExpectation || '--',
    specialConsiderations: extractSection('specialConsiderations') || '--',
    estimatedScope: extractSection('estimatedScope') || '--',
    initiationNextStep: extractSection('initiationNextStep') || defaultNextStep,
  };
}

function generateFallbackSummary(
  service: string,
  parameters: Record<string, string>
): ProjectSummary {
  const serviceName = serviceDisplayNames[service] || service.replace(/_/g, ' ');
  
  const area = parameters.size_sqft || parameters.areaSqft || parameters.carpetAreaSqft || parameters.builtUpAreaSqft ||
               parameters.plotSize || parameters.totalAreaSqft || parameters.availableRoofAreaSqft || '';
  const budget = parameters.budget || parameters.budgetRange || parameters.budgetTier || parameters.budgetBrandFlexibility || '';
  const timeline = parameters.timeline || parameters.timelineExpectation || parameters.installationTimeline ||
                   parameters.accessTimeline || '';
  const spaceType = parameters.project_type || parameters.spaceType || parameters.propertyType || parameters.projectType ||
                    parameters.homeType || parameters.eventType || '';

  const initiationNextStep =
    parameters.callback_time && parameters.contact_pref
      ? `Call client ${parameters.callback_time} via ${parameters.contact_pref}. Prepare proposal for ${budget || 'budget'} within ${timeline || 'timeline'}.`
      : `Follow up via ${parameters.contact_pref || 'phone'}. Prepare proposal for ${budget || 'budget'}, ${timeline || 'flexible timeline'}.`;

  return {
    projectOverview: `${serviceName} project${spaceType ? ` for ${spaceType}` : ''}${area ? `, ${area}` : ''}`,
    scopeOfWork: '--',
    clientRequirements: `Budget: ${budget || 'Not specified'} | Timeline: ${timeline || 'Flexible'}`,
    technicalSpecs: '--',
    timeline: timeline || '--',
    specialConsiderations: '--',
    estimatedScope: `${area || 'Size not specified'} | ${budget || 'Budget not specified'}`,
    initiationNextStep,
  };
}

// ============================================================================
// 6-POINT SUMMARY GENERATOR (Auto-generated on conversation completion)
// ============================================================================

export async function generateSixPointSummary(doc: QuestionnaireDoc): Promise<SixPointSummary> {
  const serviceName = serviceDisplayNames[doc.service] || doc.service.replace(/_/g, ' ');
  
  // Flatten parameters
  const flatParams: Record<string, string> = {};
  Object.entries(doc.parameters || {}).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null && 'value' in val) {
      flatParams[key] = String(val.value);
    } else {
      flatParams[key] = String(val);
    }
  });

  // Build parameter summary
  const paramSummary = Object.entries(flatParams)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  // Build conversation summary
  const conversationLength = doc.transcript?.length || 0;
  const userMessages = doc.transcript?.filter(m => m.role === 'user').length || 0;
  
  // Mood analysis
  const moodMeta = doc.conversationMeta;
  const moodSummary = getMoodAnalysisSummary(moodMeta);

  const systemPrompt = `You are an executive assistant creating a concise 6-point summary for a project manager.

SERVICE: ${serviceName}
CHANNEL: ${doc.channel || 'web'}

COLLECTED DATA:
${paramSummary}

CONVERSATION STATS:
- Total turns: ${conversationLength}
- User messages: ${userMessages}
- Duration: ${getConversationDuration(doc)}

MOOD ANALYSIS:
${moodSummary}

Generate a JSON with exactly 6 fields. Each should be 1-2 sentences max:

{
  "clientProfile": "Brief client description - contact preference, communication style, urgency level",
  "projectScope": "What they want - type, size, style in one line",
  "keyRequirements": "Must-haves, special focus areas, things to avoid",
  "budgetTimeline": "Budget and timeline in simple format",
  "conversationInsights": "How the conversation went - was client clear, confused, rushed? Any friction points?",
  "nextSteps": "Recommended follow-up action based on their contact preference and callback time"
}

Be factual and concise. No fluff. Return JSON only.`;

  try {
    const response = await geminiAPIClient.generateText({
      model: 'gemini-2.5-flash',
      system: systemPrompt,
      user: 'Generate the 6-point summary JSON.',
      temperature: 0.25,
    });

    const responseText = String(response.data);
    
    // Extract JSON
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    
    return {
      clientProfile: parsed.clientProfile || '--',
      projectScope: parsed.projectScope || '--',
      keyRequirements: parsed.keyRequirements || '--',
      budgetTimeline: parsed.budgetTimeline || '--',
      conversationInsights: parsed.conversationInsights || '--',
      nextSteps: parsed.nextSteps || '--',
      generatedAt: new Date(),
      moodSummary: moodSummary,
    };
  } catch (error) {
    console.error('Error generating 6-point summary:', error);
    return generateFallbackSixPointSummary(doc, flatParams, moodSummary);
  }
}

function getMoodAnalysisSummary(moodMeta: QuestionnaireDoc['conversationMeta']): string {
  if (!moodMeta || !moodMeta.moodHistory || moodMeta.moodHistory.length === 0) {
    return 'No mood data available';
  }

  const moodCounts: Record<string, number> = {};
  moodMeta.moodHistory.forEach(mood => {
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });

  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  const frustrationLevel = moodCounts['frustrated'] || 0;
  const positiveLevel = moodCounts['positive'] || 0;
  const totalTurns = moodMeta.moodHistory.length;

  let sentiment = 'neutral';
  if (positiveLevel > totalTurns * 0.5) sentiment = 'positive';
  else if (frustrationLevel > 0) sentiment = 'had friction';
  else if (moodCounts['rushed'] > totalTurns * 0.3) sentiment = 'was rushed';
  else if (moodCounts['uncertain'] > totalTurns * 0.3) sentiment = 'needed guidance';

  return `Dominant mood: ${dominantMood} | Overall sentiment: ${sentiment} | Frustration points: ${frustrationLevel} | Positive moments: ${positiveLevel}`;
}

function getConversationDuration(doc: QuestionnaireDoc): string {
  if (!doc.createdAt || !doc.updatedAt) return 'Unknown';
  
  const start = new Date(doc.createdAt).getTime();
  const end = new Date(doc.updatedAt).getTime();
  const durationMs = end - start;
  
  if (durationMs < 60000) return 'Less than 1 minute';
  if (durationMs < 3600000) return `${Math.round(durationMs / 60000)} minutes`;
  return `${Math.round(durationMs / 3600000)} hours`;
}

function generateFallbackSixPointSummary(
  doc: QuestionnaireDoc,
  params: Record<string, string>,
  moodSummary: string
): SixPointSummary {
  const serviceName = serviceDisplayNames[doc.service] || doc.service.replace(/_/g, ' ');
  
  return {
    clientProfile: `${doc.channel || 'Web'} inquiry | Contact: ${params.contact_pref || 'Not specified'}`,
    projectScope: `${serviceName} - ${params.project_type || params.spaceType || 'Type not specified'} | ${params.rooms || ''} | ${params.size_sqft || params.areaSqft || 'Size not specified'}`,
    keyRequirements: `Style: ${params.style || 'Not specified'} | Focus: ${params.notes || params.must_haves || 'None specified'}`,
    budgetTimeline: `Budget: ${params.budget || params.budgetRange || 'Not specified'} | Timeline: ${params.timeline || 'Flexible'}`,
    conversationInsights: `${doc.transcript?.length || 0} turns | ${moodSummary}`,
    nextSteps: params.callback_time 
      ? `Call client ${params.callback_time} via ${params.contact_pref || 'phone'}`
      : `Follow up via ${params.contact_pref || 'phone'}`,
    generatedAt: new Date(),
    moodSummary: moodSummary,
  };
}

