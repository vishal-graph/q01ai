/**
 * Summary Generator - Generates structured 6-section summary from collected parameters
 */

import { geminiAPIClient } from '@tatvaops/ai';
import { serviceParameters } from './parameters';

export interface ProjectSummary {
  projectOverview: string;
  scopeOfWork: string;
  clientRequirements: string;
  technicalSpecs: string;
  timeline: string;
  specialConsiderations: string;
  estimatedScope: string;
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

export async function generateProjectSummary(
  service: string,
  parameters: Record<string, string>
): Promise<ProjectSummary> {
  const serviceName = serviceDisplayNames[service] || service.replace(/_/g, ' ');
  const params = serviceParameters[service] || [];
  
  // Build a readable parameter summary
  const paramSummary = Object.entries(parameters)
    .map(([key, value]) => {
      const paramDef = params.find(p => p.id === key);
      const label = paramDef?.label || key;
      return `- ${label}: ${value}`;
    })
    .join('\n');

  const systemPrompt = `You are a professional project consultant. Based on the collected questionnaire parameters for a ${serviceName} project, generate a structured project summary.

COLLECTED PARAMETERS:
${paramSummary}

SERVICE TYPE: ${serviceName}

Generate a JSON response with exactly these 7 fields. Each field should be concise (max 3-4 lines):

1. "projectOverview": A brief one-liner describing the project based on all collected parameters. Include key details like area, type, and status.

2. "scopeOfWork": List the main work items/deliverables based on the service type and parameters. Be specific to the service (e.g., for interiors: design, furniture, execution; for construction: civil, MEP, finishing).

3. "clientRequirements": Summarize what the client wants from their perspective - their vision, preferences, and priorities based on the parameters.

4. "technicalSpecs": Extract any technical specifications from the parameters (e.g., materials, finishes, equipment types, system configurations). If none are explicitly mentioned, infer reasonable specs based on the service and other parameters.

5. "timeline": State the project timeline based on the collected parameters. If a specific timeline was given, use it. Otherwise, suggest a reasonable timeline based on scope.

6. "specialConsiderations": Note any special requirements, focus areas, pain points, or emphasis the client mentioned. If none, write "No special considerations noted."

7. "estimatedScope": Describe the project size/scale and complexity. Include the budget range if provided. Format: "[Size/Area] | [Complexity: Low/Medium/High] | [Budget: X]"

Keep each section factual, professional, and directly derived from the parameters. No fluff or generic statements.`;

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
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        projectOverview: parsed.projectOverview || '--',
        scopeOfWork: parsed.scopeOfWork || '--',
        clientRequirements: parsed.clientRequirements || '--',
        technicalSpecs: parsed.technicalSpecs || '--',
        timeline: parsed.timeline || '--',
        specialConsiderations: parsed.specialConsiderations || '--',
        estimatedScope: parsed.estimatedScope || '--',
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

  return {
    projectOverview: extractSection('projectOverview') || `${serviceName} project`,
    scopeOfWork: extractSection('scopeOfWork') || '--',
    clientRequirements: extractSection('clientRequirements') || '--',
    technicalSpecs: extractSection('technicalSpecs') || '--',
    timeline: extractSection('timeline') || parameters.timeline || parameters.timelineExpectation || '--',
    specialConsiderations: extractSection('specialConsiderations') || '--',
    estimatedScope: extractSection('estimatedScope') || '--',
  };
}

function generateFallbackSummary(
  service: string,
  parameters: Record<string, string>
): ProjectSummary {
  const serviceName = serviceDisplayNames[service] || service.replace(/_/g, ' ');
  
  // Extract common fields
  const area = parameters.areaSqft || parameters.carpetAreaSqft || parameters.builtUpAreaSqft || 
               parameters.plotSize || parameters.totalAreaSqft || parameters.availableRoofAreaSqft || '';
  const budget = parameters.budgetRange || parameters.budgetTier || parameters.budgetBrandFlexibility || '';
  const timeline = parameters.timeline || parameters.timelineExpectation || parameters.installationTimeline || 
                   parameters.accessTimeline || '';
  const spaceType = parameters.spaceType || parameters.propertyType || parameters.projectType || 
                    parameters.homeType || parameters.eventType || '';

  return {
    projectOverview: `${serviceName} project${spaceType ? ` for ${spaceType}` : ''}${area ? `, ${area}` : ''}`,
    scopeOfWork: '--',
    clientRequirements: `Budget: ${budget || 'Not specified'} | Timeline: ${timeline || 'Flexible'}`,
    technicalSpecs: '--',
    timeline: timeline || '--',
    specialConsiderations: '--',
    estimatedScope: `${area || 'Size not specified'} | ${budget || 'Budget not specified'}`,
  };
}

