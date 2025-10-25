export type Param = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'bool' | 'choice' | 'media';
  goal: string;
  validationHint?: string;
  followUps?: string[];
  examples?: string[];
  options?: string[];
  expectedFormat?: string;
};

export const serviceParameters: Record<string, Param[]> = {
  interior_design: [
    { 
      id: 'spaceType', 
      label: 'Space Type', 
      type: 'choice', 
      goal: 'Identify project category',
      options: ['Apartment', 'Villa', 'Office', 'Retail/Shop', 'Other'],
      expectedFormat: 'Choose from: Apartment, Villa, Office, Retail/Shop, or Other'
    },
    { 
      id: 'areaSqft', 
      label: 'Area (sq.ft)', 
      type: 'number', 
      goal: 'Determine scale and budget mapping',
      expectedFormat: 'Number in square feet (e.g., 1200, 1500)'
    },
    { 
      id: 'bhkRoomCount', 
      label: 'BHK / Room Count', 
      type: 'number', 
      goal: 'Define layout complexity',
      expectedFormat: 'Number of bedrooms (e.g., 2, 3, 4)'
    },
    { 
      id: 'stylePreference', 
      label: 'Style Preference', 
      type: 'choice', 
      goal: 'Creative direction',
      options: ['Modern', 'European/Classic', 'Cozy & Classic', 'Luxury', 'Minimalist', 'Traditional'],
      expectedFormat: 'Choose from: Modern, European/Classic, Cozy & Classic, Luxury, Minimalist, or Traditional'
    },
    { 
      id: 'budgetRange', 
      label: 'Budget Range', 
      type: 'text', 
      goal: 'Material & planning alignment',
      expectedFormat: 'Amount in lakhs (e.g., 3 lakhs, 5-7 lakhs)'
    },
    { 
      id: 'timeline', 
      label: 'Timeline', 
      type: 'choice', 
      goal: 'Pacing for milestones',
      options: ['1 month', '2 months', '3 months', '6 months', '1 year', 'Flexible'],
      expectedFormat: 'Choose from: 1 month, 2 months, 3 months, 6 months, 1 year, or Flexible'
    },
    { 
      id: 'floorPlanAvailability', 
      label: 'Floor Plan Availability', 
      type: 'choice', 
      goal: 'Quotation accuracy',
      options: ['Yes', 'No', 'I\'ll share later'],
      expectedFormat: 'Yes, No, or I\'ll share later'
    },
    { 
      id: 'specialZonesFocus', 
      label: 'Special Zones / Focus', 
      type: 'choice', 
      goal: 'Priority areas',
      options: ['Living Room', 'Kitchen', 'Master Bedroom', 'All Rooms', 'Dining Area', 'Study Room'],
      expectedFormat: 'Choose from: Living Room, Kitchen, Master Bedroom, All Rooms, Dining Area, or Study Room'
    },
    { 
      id: 'inspirationsMoodboard', 
      label: 'Inspirations / Moodboard', 
      type: 'choice', 
      goal: 'Mood & theme cues',
      options: ['Calm & Cozy', 'Bright & Vibrant', 'Luxury & Elegant', 'Minimal & Clean', 'Warm & Earthy', 'Not Sure'],
      expectedFormat: 'Choose from: Calm & Cozy, Bright & Vibrant, Luxury & Elegant, Minimal & Clean, Warm & Earthy, or Not Sure'
    },
  ],
  construction: [
    { 
      id: 'plotSize', 
      label: 'Plot Size', 
      type: 'text', 
      goal: 'Foundation & scope estimation',
      expectedFormat: 'Size in sqft or dimensions (e.g., 1200 sqft, 30x40 ft)'
    },
    { 
      id: 'plotType', 
      label: 'Plot Type / Zone', 
      type: 'choice', 
      goal: 'Approval norms',
      options: ['BBMP', 'DTCP', 'Private Site', 'Other'],
      expectedFormat: 'Choose from: BBMP, DTCP, Private Site, or Other'
    },
    { 
      id: 'approvalStatus', 
      label: 'Approval Status', 
      type: 'bool', 
      goal: 'Readiness for design',
      expectedFormat: 'Yes or No'
    },
    { 
      id: 'soilTestStatus', 
      label: 'Soil Test Status', 
      type: 'bool', 
      goal: 'Safety pre-check',
      expectedFormat: 'Yes or No'
    },
    { 
      id: 'numberOfFloors', 
      label: 'Number of Floors', 
      type: 'number', 
      goal: 'Structural base',
      expectedFormat: 'Number of floors (e.g., 1, 2, 3)'
    },
    { 
      id: 'structureType', 
      label: 'Structure Type', 
      type: 'choice', 
      goal: 'RCC vs alternatives',
      options: ['RCC Frame', 'Load Bearing', 'Hybrid', 'Steel Frame'],
      expectedFormat: 'Choose from: RCC Frame, Load Bearing, Hybrid, or Steel Frame'
    },
    { 
      id: 'constructionStage', 
      label: 'Construction Stage', 
      type: 'choice', 
      goal: 'New vs ongoing',
      options: ['New Project', 'Mid-way Construction', 'Renovation', 'Extension'],
      expectedFormat: 'Choose from: New Project, Mid-way Construction, Renovation, or Extension'
    },
    { 
      id: 'timeline', 
      label: 'Timeline (months)', 
      type: 'text', 
      goal: 'Schedule planning',
      expectedFormat: 'Duration in months (e.g., 6 months, 1 year)'
    },
    { 
      id: 'budgetRange', 
      label: 'Budget Range', 
      type: 'text', 
      goal: 'Material & phases',
      expectedFormat: 'Amount in lakhs (e.g., 20 lakhs, 50-70 lakhs)'
    },
  ],
  home_automation: [
    { 
      id: 'homeType', 
      label: 'Home Type', 
      type: 'choice', 
      goal: 'Wiring vs retrofit',
      options: ['New Build', 'Existing Home', 'Under Construction'],
      expectedFormat: 'Choose from: New Build, Existing Home, or Under Construction'
    },
    { 
      id: 'automationFocus', 
      label: 'Automation Focus', 
      type: 'choice', 
      goal: 'Lighting/security/climate',
      options: ['Lighting Control', 'Security & Safety', 'Climate Control', 'All of the Above'],
      expectedFormat: 'Choose from: Lighting Control, Security & Safety, Climate Control, or All of the Above'
    },
    { 
      id: 'roomsToAutomate', 
      label: 'Rooms to Automate', 
      type: 'text', 
      goal: 'Device count & mapping',
      expectedFormat: 'List of rooms (e.g., Living Room, Bedroom, Kitchen)'
    },
    { 
      id: 'powerBackupInverter', 
      label: 'Power Backup', 
      type: 'bool', 
      goal: 'System compatibility',
      expectedFormat: 'Yes or No'
    },
    { 
      id: 'wifiNetworkStrength', 
      label: 'Wi-Fi Strength', 
      type: 'choice', 
      goal: 'Ecosystem stability',
      options: ['Strong', 'Moderate', 'Weak', 'Not Sure'],
      expectedFormat: 'Choose from: Strong, Moderate, Weak, or Not Sure'
    },
    { 
      id: 'ecosystemPreference', 
      label: 'Ecosystem Preference', 
      type: 'choice', 
      goal: 'Voice/app-based',
      options: ['Alexa', 'Google Assistant', 'Apple HomeKit', 'App-based Only'],
      expectedFormat: 'Choose from: Alexa, Google Assistant, Apple HomeKit, or App-based Only'
    },
    { 
      id: 'securityPriority', 
      label: 'Security Priority', 
      type: 'bool', 
      goal: 'Cameras/sensors',
      expectedFormat: 'Yes or No'
    },
    { 
      id: 'budgetTier', 
      label: 'Budget Tier', 
      type: 'choice', 
      goal: 'Product planning',
      options: ['Economical', 'Mid-range', 'Premium', 'Luxury'],
      expectedFormat: 'Choose from: Economical, Mid-range, Premium, or Luxury'
    },
    { 
      id: 'lifestylePatterns', 
      label: 'Lifestyle Patterns', 
      type: 'text', 
      goal: 'Scene intelligence',
      expectedFormat: 'Describe your daily routine (e.g., early riser, night owl, work from home)'
    },
  ],
  painting: [
    { 
      id: 'propertyType', 
      label: 'Property Type', 
      type: 'choice', 
      goal: 'Surface preparation context',
      options: ['Home', 'Villa', 'Apartment', 'Office', 'Commercial'],
      expectedFormat: 'Choose from: Home, Villa, Apartment, Office, or Commercial'
    },
    { 
      id: 'interiorOrExterior', 
      label: 'Interior or Exterior', 
      type: 'choice', 
      goal: 'Product family',
      options: ['Interior Only', 'Exterior Only', 'Both Interior & Exterior'],
      expectedFormat: 'Choose from: Interior Only, Exterior Only, or Both Interior & Exterior'
    },
    { 
      id: 'surfaceCondition', 
      label: 'Surface Condition', 
      type: 'text', 
      goal: 'Repair / damp proofing',
      expectedFormat: 'Describe condition (e.g., good, cracks, damp patches, peeling)'
    },
    { 
      id: 'oldPaintType', 
      label: 'Old Paint Type', 
      type: 'choice', 
      goal: 'Primer compatibility',
      options: ['Emulsion', 'Enamel', 'Distemper', 'Not Sure', 'No Previous Paint'],
      expectedFormat: 'Choose from: Emulsion, Enamel, Distemper, Not Sure, or No Previous Paint'
    },
    { 
      id: 'colourThemeIntent', 
      label: 'Colour Theme / Intent', 
      type: 'text', 
      goal: 'Visual direction',
      expectedFormat: 'Describe color preference (e.g., warm, cool, neutral, bright, earthy)'
    },
    { 
      id: 'finishPreference', 
      label: 'Finish Preference', 
      type: 'choice', 
      goal: 'Product-level decision',
      options: ['Matte', 'Satin', 'Glossy', 'Semi-Gloss', 'Not Sure'],
      expectedFormat: 'Choose from: Matte, Satin, Glossy, Semi-Gloss, or Not Sure'
    },
    { 
      id: 'totalAreaSqft', 
      label: 'Total Area (sqft)', 
      type: 'number', 
      goal: 'Quantity estimation',
      expectedFormat: 'Area in square feet (e.g., 1000, 1500)'
    },
    { 
      id: 'timeline', 
      label: 'Timeline (days)', 
      type: 'text', 
      goal: 'Resource planning',
      expectedFormat: 'Duration in days (e.g., 7 days, 2 weeks)'
    },
    { 
      id: 'budgetBrandFlexibility', 
      label: 'Budget / Brand Flexibility', 
      type: 'text', 
      goal: 'Recommendations',
      expectedFormat: 'Budget range and brand preference (e.g., 50k budget, open to any brand)'
    },
  ],
};


