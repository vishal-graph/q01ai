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
  allowMultiple?: boolean;
};

export const serviceParameters: Record<string, Param[]> = {
  interior_design: [
    {
      id: 'spaceType',
      label: 'Space Type',
      type: 'choice',
      goal: 'Identify project category',
      options: ['Home', 'Apartment', 'Villa/Farmhouse', 'Commercial Project', 'Other'],
      expectedFormat: 'Choose from: Home, Apartment, Villa/Farmhouse, Commercial Project, or Other'
    },
    {
      id: 'areaSqft',
      label: 'Area (sqft)',
      type: 'choice',
      goal: 'Determine scale and budget mapping',
      options: ['500-800 sqft', '801-1200 sqft', '1201-1600 sqft', '1601-2000 sqft', 'More than 2000 sqft', 'Other'],
      expectedFormat: 'Choose a range for the area in square feet'
    },
    {
      id: 'bhkRoomCount',
      label: 'Room / BHK Count',
      type: 'choice',
      goal: 'Define layout complexity',
      options: ['Studio/1BHK', '2BHK', '3BHK', '4BHK/Villa', 'Other'],
      expectedFormat: 'Choose the number of rooms or BHK configuration'
    },
    {
      id: 'stylePreference',
      label: 'Style Preference',
      type: 'choice',
      goal: 'Creative direction',
      options: ['Modern/Contemporary', 'Neo-Indian/Traditional', 'European', 'Japandi', 'Not Sure', 'Other'],
      expectedFormat: 'Choose your preferred design style'
    },
    {
      id: 'budgetRange',
      label: 'Budget Range (₹)',
      type: 'choice',
      goal: 'Material & planning alignment',
      options: ['1-3 Lakhs', '3-5 Lakhs', '5-8 Lakhs', 'More than 8 Lakhs', 'Flexible', 'Other'],
      expectedFormat: 'Choose your approximate budget range in Lakhs'
    },
    {
      id: 'timeline',
      label: 'Timeline',
      type: 'choice',
      goal: 'Pacing for milestones',
      options: ['45-60 Days', '61-90 Days', 'More than 90 days', 'Flexible', 'Other'],
      expectedFormat: 'Choose your desired project timeline'
    },
    {
      id: 'floorPlanAvailability',
      label: 'Floor Plan Availability',
      type: 'choice',
      goal: 'Quotation accuracy',
      options: ['Yes', 'No', 'Other'],
      expectedFormat: 'Do you have a floor plan available?'
    },
    {
      id: 'specialZonesFocus',
      label: 'Special Zones / Focus Areas',
      type: 'choice',
      goal: 'Priority areas',
      options: ['Living Room', 'Bedroom', 'Kids Room', 'All rooms', 'Other'],
      expectedFormat: 'Choose any special focus areas'
    },
    {
      id: 'inspirationsMoodboard',
      label: 'Inspirations / Moodboard',
      type: 'text',
      goal: 'Mood & theme cues',
      expectedFormat: 'Please describe any ideas or inspirations you have'
    },
  ],
  construction: [
    { 
      id: 'plotSize', 
      label: 'Plot Size', 
      type: 'choice', 
      goal: 'Foundation & scope estimation',
      options: ['<1200 sqft', '1200-2400 sqft', '2401-4000 sqft', '4001-6000 sqft', '6000+ sqft', 'Not Sure', 'Other'],
      expectedFormat: 'Choose a range for plot size in square feet'
    },
    { 
      id: 'plotType', 
      label: 'Plot Type / Zone', 
      type: 'choice', 
      goal: 'Approval norms',
      options: ['BBMP', 'DTCP', 'BMRDA', 'Panchayat', 'Private Site', 'Not Sure', 'Other'],
      expectedFormat: 'Choose from: BBMP, DTCP, BMRDA, Panchayat, Private Site, Not Sure, or Other'
    },
    { 
      id: 'approvalStatus', 
      label: 'Approval Status', 
      type: 'choice', 
      goal: 'Readiness for design',
      options: ['Yes', 'No', 'In Progress', 'Not Started', 'Not Sure'],
      expectedFormat: 'Choose approval status: Yes, No, In Progress, Not Started, or Not Sure'
    },
    { 
      id: 'soilTestStatus', 
      label: 'Soil Test Status', 
      type: 'choice', 
      goal: 'Safety pre-check',
      options: ['Yes (report available)', 'Scheduled', 'No', 'Not Sure'],
      expectedFormat: 'Choose: Yes (report available), Scheduled, No, or Not Sure'
    },
    { 
      id: 'numberOfFloors', 
      label: 'Number of Floors', 
      type: 'choice', 
      goal: 'Structural base',
      options: ['G', 'G+1', 'G+2', 'G+3', '4+ Floors', 'Not Sure'],
      expectedFormat: 'Choose floors: G, G+1, G+2, G+3, 4+ Floors, or Not Sure'
    },
    { 
      id: 'structureType', 
      label: 'Structure Type', 
      type: 'choice', 
      goal: 'RCC vs alternatives',
      options: ['RCC Frame', 'Load Bearing', 'Hybrid', 'Steel Frame', 'Not Sure'],
      expectedFormat: 'Choose from: RCC Frame, Load Bearing, Hybrid, Steel Frame, or Not Sure'
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
      label: 'Timeline', 
      type: 'choice', 
      goal: 'Schedule planning',
      options: ['< 3 months', '3–6 months', '6–9 months', '> 9 months', 'Flexible', 'Not Sure'],
      expectedFormat: 'Choose your target timeline'
    },
    { 
      id: 'budgetRange', 
      label: 'Budget Range (₹)', 
      type: 'choice', 
      goal: 'Material & phases',
      options: ['< ₹20L', '₹20–35L', '₹35–50L', '₹50–75L', '₹75L+', 'Flexible', 'Not Sure'],
      expectedFormat: 'Choose a budget range in Lakhs'
    },
  ],
  home_automation: [
    { 
      id: 'homeType', 
      label: 'Home Type', 
      type: 'choice', 
      goal: 'Wiring vs retrofit',
      options: ['New Build', 'Existing Home', 'Under Construction', 'Rental Property', 'Not Sure'],
      expectedFormat: 'Choose from: New Build, Existing Home, Under Construction, Rental Property, or Not Sure'
    },
    { 
      id: 'automationFocus', 
      label: 'Automation Focus', 
      type: 'choice', 
      goal: 'Lighting/security/climate',
      options: ['Lighting & Ambience', 'Security & Safety', 'Climate & Energy', 'Entertainment & Media', 'Whole Home Suite', 'Not Sure'],
      expectedFormat: 'You can choose multiple: Lighting & Ambience, Security & Safety, Climate & Energy, Entertainment & Media, Whole Home Suite, or Not Sure',
      allowMultiple: true
    },
    { 
      id: 'roomsToAutomate', 
      label: 'Rooms to Automate', 
      type: 'choice', 
      goal: 'Device count & mapping',
      options: ['Living Room & Common Areas', 'Bedrooms', 'Kitchen & Dining', 'Entire Home', 'Specific Zones Only', 'Not Decided'],
      expectedFormat: 'Choose rooms: Living Room & Common Areas, Bedrooms, Kitchen & Dining, Entire Home, Specific Zones Only, or Not Decided'
    },
    { 
      id: 'powerBackupInverter', 
      label: 'Power Backup', 
      type: 'choice', 
      goal: 'System compatibility',
      options: ['Yes (already installed)', 'Planning to install', 'No backup', 'Not Sure'],
      expectedFormat: 'Choose: Yes (already installed), Planning to install, No backup, or Not Sure'
    },
    { 
      id: 'wifiNetworkStrength', 
      label: 'Wi-Fi Strength', 
      type: 'choice', 
      goal: 'Ecosystem stability',
      options: ['Strong throughout home', 'Moderate (few weak spots)', 'Weak (needs upgrade)', 'Currently no Wi-Fi', 'Need on-site assessment'],
      expectedFormat: 'Choose Wi-Fi status: Strong, Moderate, Weak, No Wi-Fi, or Need assessment'
    },
    { 
      id: 'ecosystemPreference', 
      label: 'Ecosystem Preference', 
      type: 'choice', 
      goal: 'Voice/app-based',
      options: ['Amazon Alexa', 'Google Assistant', 'Apple HomeKit', 'App-based Only', 'Open to suggestions'],
      expectedFormat: 'Choose: Amazon Alexa, Google Assistant, Apple HomeKit, App-based Only, or Open to suggestions'
    },
    { 
      id: 'securityPriority', 
      label: 'Security Priority', 
      type: 'choice', 
      goal: 'Cameras/sensors',
      options: ['High (CCTV & sensors)', 'Medium (basic alerts)', 'Low priority', 'Not Sure'],
      expectedFormat: 'Choose security focus: High, Medium, Low, or Not Sure'
    },
    { 
      id: 'budgetTier', 
      label: 'Budget Tier', 
      type: 'choice', 
      goal: 'Product planning',
      options: ['Economical', 'Mid-range', 'Premium', 'Luxury', 'Flexible'],
      expectedFormat: 'Choose budget tier: Economical, Mid-range, Premium, Luxury, or Flexible'
    },
    { 
      id: 'lifestylePatterns', 
      label: 'Lifestyle Patterns', 
      type: 'choice', 
      goal: 'Scene intelligence',
      options: ['Working professionals', 'Mostly at home', 'Senior-friendly home', 'Rental / AirBnB', 'Vacation / Second Home', 'Not Sure'],
      expectedFormat: 'Choose: Working professionals, Mostly at home, Senior-friendly, Rental/AirBnB, Vacation home, or Not Sure'
    },
  ],
  painting: [
    { 
      id: 'propertyType', 
      label: 'Property Type', 
      type: 'choice', 
      goal: 'Surface preparation context',
      options: ['Apartment', 'Independent House', 'Villa', 'Office Space', 'Retail/Commercial', 'Other'],
      expectedFormat: 'Choose from: Apartment, Independent House, Villa, Office Space, Retail/Commercial, or Other'
    },
    { 
      id: 'interiorOrExterior', 
      label: 'Interior or Exterior', 
      type: 'choice', 
      goal: 'Product family',
      options: ['Interior Only', 'Exterior Only', 'Both Interior & Exterior', 'Feature Walls Only'],
      expectedFormat: 'Choose from: Interior Only, Exterior Only, Both Interior & Exterior, or Feature Walls Only'
    },
    { 
      id: 'surfaceCondition', 
      label: 'Surface Condition', 
      type: 'choice', 
      goal: 'Repair / damp proofing',
      options: ['Fresh / Good condition', 'Minor cracks or flaking', 'Damp patches present', 'Peeling / bubbling paint', 'Major repair needed', 'Not Sure'],
      expectedFormat: 'Choose condition: Fresh, Minor cracks, Damp patches, Peeling, Major repair, or Not Sure'
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
      type: 'choice', 
      goal: 'Visual direction',
      options: ['Warm & Cozy', 'Soft Pastels', 'Earthy / Natural', 'Bright & Vibrant', 'Monochrome / Minimal', 'Accent Feature Wall', 'Not Sure'],
      expectedFormat: 'Choose your colour mood: Warm, Pastels, Earthy, Vibrant, Monochrome, Feature Wall, or Not Sure'
    },
    { 
      id: 'finishPreference', 
      label: 'Finish Preference', 
      type: 'choice', 
      goal: 'Product-level decision',
      options: ['Matte', 'Eggshell', 'Satin', 'Semi-Gloss', 'High Gloss', 'Not Sure'],
      expectedFormat: 'Choose from: Matte, Eggshell, Satin, Semi-Gloss, High Gloss, or Not Sure'
    },
    { 
      id: 'totalAreaSqft', 
      label: 'Total Area (sqft)', 
      type: 'choice', 
      goal: 'Quantity estimation',
      options: ['< 800 sqft', '800 - 1200 sqft', '1201 - 1800 sqft', '1801 - 2500 sqft', '2500+ sqft', 'Not Sure'],
      expectedFormat: 'Choose the total paintable area range'
    },
    { 
      id: 'timeline', 
      label: 'Timeline', 
      type: 'choice', 
      goal: 'Resource planning',
      options: ['Within 1 week', '1-2 weeks', '3-4 weeks', 'Next month', 'Flexible', 'Just exploring'],
      expectedFormat: 'Choose your preferred project window'
    },
    { 
      id: 'budgetBrandFlexibility', 
      label: 'Budget / Brand Flexibility', 
      type: 'choice', 
      goal: 'Recommendations',
      options: ['Economical (< ₹40k)', 'Mid-range (₹40k - ₹70k)', 'Premium (₹70k - ₹1.2L)', 'Luxury (₹1.2L+)', 'Brand agnostic', 'Specific premium brands only'],
      expectedFormat: 'Choose budget range or brand preference'
    },
  ],
  solar_services: [
    {
      id: 'propertyType',
      label: 'Property Type',
      type: 'choice',
      goal: 'Determines load & roof area',
      options: ['Independent House', 'Apartment', 'Villa', 'Commercial Building', 'Industrial Shed', 'Institutional / School', 'Other'],
      expectedFormat: 'Choose from: Independent House, Apartment, Villa, Commercial Building, Industrial Shed, Institutional/School, or Other'
    },
    {
      id: 'roofTypeOrientation',
      label: 'Roof Type & Orientation',
      type: 'choice',
      goal: 'Feasibility for panels',
      options: ['Flat RCC terrace (open)', 'Tiled / Sloped roof', 'Metal sheet roof', 'Mixed terrace + utilities', 'Partially shaded terrace', 'Ground-mounted area', 'Not Sure'],
      expectedFormat: 'Choose roof type / orientation or select Not Sure'
    },
    {
      id: 'availableRoofAreaSqft',
      label: 'Available Roof Area (sqft)',
      type: 'choice',
      goal: 'Panel capacity calculation',
      options: ['< 200 sqft (1-2 kW)', '200 - 400 sqft (2-4 kW)', '401 - 650 sqft (4-6 kW)', '651 - 900 sqft (6-8 kW)', '901+ sqft (8 kW+)', 'Not Sure'],
      expectedFormat: 'Choose the approximate usable sunlit area'
    },
    {
      id: 'monthlyBillInr',
      label: 'Current Electricity Bill (₹/month)',
      type: 'choice',
      goal: 'Load estimation (kWh/day)',
      options: ['< ₹1,500', '₹1,500 - ₹3,000', '₹3,001 - ₹5,000', '₹5,001 - ₹8,000', '₹8,001+', 'Seasonal spikes only', 'Not Sure'],
      expectedFormat: 'Choose your average monthly bill band'
    },
    {
      id: 'desiredSolarType',
      label: 'Desired Solar Type',
      type: 'choice',
      goal: 'System design choice',
      options: ['On-grid', 'Hybrid', 'Off-grid', 'Not Sure'],
      expectedFormat: 'Choose from: On-grid, Hybrid, Off-grid, Not Sure'
    },
    {
      id: 'backupRequirement',
      label: 'Backup Requirement',
      type: 'choice',
      goal: 'Battery sizing',
      options: ['Yes, power cuts are frequent', 'Yes, want critical load backup', 'No, grid is reliable', 'Considering later', 'Not Sure'],
      expectedFormat: 'Choose your backup requirement preference'
    },
    {
      id: 'budgetRange',
      label: 'Budget Range (₹)',
      type: 'choice',
      goal: 'Proposal alignment',
      options: ['₹1.5L - ₹2.5L', '₹2.5L - ₹4L', '₹4L - ₹6L', '₹6L+', 'Exploring financing options', 'Flexible / need guidance'],
      expectedFormat: 'Choose a budget band or financing preference'
    },
    {
      id: 'interestedInSubsidy',
      label: 'Interest in Subsidy',
      type: 'choice',
      goal: 'Determine policy applicability',
      options: ['Yes, residential subsidy', 'Yes, commercial scheme', 'Need help understanding eligibility', 'No, not required'],
      expectedFormat: 'Choose your subsidy interest'
    },
    {
      id: 'installationTimeline',
      label: 'Timeline / Installation Goal',
      type: 'choice',
      goal: 'Planning and vendor sync',
      options: ['Within 1 month', '1-2 months', 'This quarter', 'After monsoon', 'Just exploring options'],
      expectedFormat: 'Choose your target installation window'
    }
  ],
  irrigation_automation: [
    {
      id: 'farmSizeCrop',
      label: 'Farm Size & Crop Type',
      type: 'choice',
      goal: 'Determine zone design, water requirement and scheduling',
      options: [
        'Vegetables – < 1 acre',
        'Horticulture – 1–5 acres',
        'Plantation – 5–10 acres',
        'Open Field Crops – >10 acres',
        'Mixed Farming (Multiple crops across different plots)',
        'Greenhouse / Polyhouse crops'
      ],
      expectedFormat: 'Choose the crop layout that matches your farm'
    },
    {
      id: 'currentIrrigationMethod',
      label: 'Current Irrigation Method',
      type: 'choice',
      goal: 'Understand upgrade path and baseline efficiency',
      options: ['Manual flood / channel', 'Basic drip lines', 'Sprinkler / rain gun', 'Micro / misting', 'Combination setup', 'Not sure / other'],
      expectedFormat: 'Choose the irrigation style you currently follow'
    },
    {
      id: 'waterSource',
      label: 'Water Source & Pressure',
      type: 'choice',
      goal: 'Pump sizing and pressure balancing for automation',
      options: [
        'Borewell (high yield)',
        'Borewell (low yield)',
        'Open well / Farm pond',
        'Overhead tank / Sump storage',
        'Canal / River source',
        'Not sure about pressure — need assessment'
      ],
      expectedFormat: 'Select the water source and pressure condition'
    },
    {
      id: 'soilType',
      label: 'Soil Type',
      type: 'choice',
      goal: 'Plan moisture retention logic and scheduling buffers',
      options: [
        'Red soil (fast draining)',
        'Black soil (high moisture retention)',
        'Sandy soil (very fast draining)',
        'Mixed soil (red + black)',
        'Rocky / Hard soil',
        'Not sure — require soil test'
      ],
      expectedFormat: 'Pick the soil family that matches your fields'
    },
    {
      id: 'automationPreference',
      label: 'Preferred Automation Level',
      type: 'choice',
      goal: 'Select appropriate controller and valve logic',
      options: [
        'Fully manual control',
        'Semi-automatic (timer-based valves)',
        'Fully automated (IoT + motor + valve control)',
        'Automated only for irrigation lines',
        'Automated only for pump/motor',
        'Need guidance to decide'
      ],
      expectedFormat: 'Choose the control style you are comfortable with'
    },
    {
      id: 'powerReliability',
      label: 'Power Availability & Backup',
      type: 'choice',
      goal: 'Assess feasibility of pump automation and scheduling',
      options: [
        'No power cuts',
        'Occasional power cuts (1–2 hrs)',
        'Frequent power cuts (3–6 hrs)',
        'Daily long outages (6+ hrs)',
        'Require solar pump backup',
        'Not sure'
      ],
      expectedFormat: 'Describe current power condition for pumps and controllers'
    },
    {
      id: 'budgetRange',
      label: 'Budget Range (₹)',
      type: 'choice',
      goal: 'Align proposal, ROI narrative and component selection',
      options: [
        'Under ₹50,000',
        '₹50,000 – ₹1,00,000',
        '₹1,00,000 – ₹2,50,000',
        '₹2,50,000 – ₹5,00,000',
        '₹5,00,000 – ₹10,00,000',
        'Above ₹10,00,000'
      ],
      expectedFormat: 'Pick the budget window you are considering'
    },
    {
      id: 'fertigationInterest',
      label: 'Interest in Fertigation Automation',
      type: 'choice',
      goal: 'Plan nutrient dosing integration and controller selection',
      options: ['Yes', 'Maybe', 'Not now', 'No', 'Undecided'],
      expectedFormat: 'Choose if you want fertilizer dosing automated'
    },
    {
      id: 'installationTimeline',
      label: 'Timeline / Installation Goal',
      type: 'choice',
      goal: 'Coordinate inspections, vendor scheduling and rollout',
      options: ['Immediately', 'This month', '2–3 months', 'Post-harvest', 'Planning stage', 'Just exploring'],
      expectedFormat: 'Select when you want the irrigation automation to be ready'
    }
  ],
  event_management: [
    {
      id: 'eventType',
      label: 'Event Type',
      type: 'choice',
      goal: 'Identify the nature of the event to scope planning requirements',
      options: ['Wedding / Reception', 'Pre-wedding function', 'Corporate event', 'Private celebration / party', 'Festival / Cultural event', 'Brand activation / Expo', 'Housewarming / Ritual', 'Other'],
      expectedFormat: 'Choose the category that best describes the event'
    },
    {
      id: 'eventDateDuration',
      label: 'Event Date & Duration',
      type: 'text',
      goal: 'Determine scheduling urgency and timeline planning',
      validationHint: 'Mention confirmed date(s) or tentative timeline plus approximate start/end times',
      expectedFormat: 'Share the event date(s) and expected duration (hours/days)'
    },
    {
      id: 'venueStatus',
      label: 'Venue Status',
      type: 'choice',
      goal: 'Assess venue readiness and location logistics',
      options: ['Venue booked', 'Shortlisted, need help finalizing', 'Need venue suggestions', 'At home / private space', 'Hybrid / multiple locations'],
      expectedFormat: 'Select the statement that matches your venue situation'
    },
    {
      id: 'guestCount',
      label: 'Guest Count',
      type: 'number',
      goal: 'Plan capacity, hospitality, and vendor scaling',
      validationHint: 'Approximate number is sufficient; ranges are acceptable',
      expectedFormat: 'Provide an approximate guest count'
    },
    {
      id: 'themeMood',
      label: 'Theme / Mood Preference',
      type: 'text',
      goal: 'Guide décor, styling, and experience design direction',
      expectedFormat: 'Describe the desired style (e.g., traditional, modern, minimal, festive, elegant)'
    },
    {
      id: 'programFlow',
      label: 'Program Flow Highlights',
      type: 'text',
      goal: 'Understand key segments to choreograph timeline and production',
      expectedFormat: 'List important segments (e.g., rituals, performances, speeches, special entries)'
    },
    {
      id: 'vendorNeeds',
      label: 'Vendor Assistance Required',
      type: 'choice',
      goal: 'Identify vendors or services that require coordination',
      options: ['Décor & styling', 'Catering & F&B', 'Photography & videography', 'Stage/sound/lighting', 'Entertainment & choreography', 'Travel & logistics', 'All of the above', 'Need guidance'],
      expectedFormat: 'Select the support areas you need TatvaOps to handle',
      allowMultiple: true
    },
    {
      id: 'budgetRange',
      label: 'Budget Range (₹)',
      type: 'choice',
      goal: 'Align planning and vendor recommendations with financial comfort',
      options: ['Under ₹5L', '₹5L – ₹10L', '₹10L – ₹20L', '₹20L – ₹40L', '₹40L+', 'Need cost guidance'],
      expectedFormat: 'Choose the budget window or indicate if guidance is needed'
    },
    {
      id: 'specialRequirements',
      label: 'Special Requirements or Requests',
      type: 'text',
      goal: 'Capture personalized touches, cultural needs, and unique expectations',
      expectedFormat: 'Share any special rituals, surprise elements, or accessibility needs'
    }
  ],
  electrical_services: [
    {
      id: 'propertyType',
      label: 'Property Type',
      type: 'choice',
      goal: 'Establish project scale and wiring complexity',
      options: ['Apartment', 'Independent House', 'Villa', 'Office Space', 'Retail/Commercial', 'Other'],
      expectedFormat: 'Choose from: Apartment, Independent House, Villa, Office Space, Retail/Commercial, or Other'
    },
    {
      id: 'wiringAge',
      label: 'Age of Wiring (years)',
      type: 'choice',
      goal: 'Safety indicator for risk assessment',
      options: ['< 5 years', '5–10 years', '10–15 years', '15+ years', 'Not Sure'],
      expectedFormat: 'Choose approximate age band or Not Sure'
    },
    {
      id: 'powerIssues',
      label: 'Frequent Power Issues',
      type: 'choice',
      goal: 'Detect voltage fluctuations or circuit problems',
      options: ['Frequent tripping', 'Flickering lights', 'Sparks or burnt smell', 'Electric shocks', 'Overheating plugs/sockets', 'None', 'Other'],
      expectedFormat: 'Choose the most relevant issue or None/Other'
    },
    {
      id: 'mainPowerSource',
      label: 'Main Power Source',
      type: 'choice',
      goal: 'Understand grid/inverter/solar mix',
      options: ['Grid Only', 'Grid + Inverter', 'Grid + Solar', 'Grid + Solar + Inverter', 'DG Backup', 'Other'],
      expectedFormat: 'Choose from: Grid Only, Grid + Inverter, Grid + Solar, Grid + Solar + Inverter, DG Backup, or Other'
    },
    {
      id: 'inverterBackup',
      label: 'Inverter / Backup System',
      type: 'choice',
      goal: 'Integration and load management',
      options: ['Yes (installed)', 'Planning to install', 'No backup', 'Not Sure'],
      expectedFormat: 'Choose: Yes (installed), Planning to install, No backup, or Not Sure'
    },
    {
      id: 'applianceLoad',
      label: 'Appliance Load Summary',
      type: 'choice',
      goal: 'Estimate power consumption',
      options: ['Light (no AC/geyser)', 'Moderate (1 AC or geyser)', 'Heavy (2+ ACs / heavy kitchen)', 'Mixed household + office', 'Not Sure'],
      expectedFormat: 'Choose load profile: Light, Moderate, Heavy, Mixed, or Not Sure'
    },
    {
      id: 'earthingSafety',
      label: 'Earthing & Safety Devices',
      type: 'choice',
      goal: 'Compliance check for safety systems',
      options: ['Yes (with ELCB/RCCB)', 'Only MCB', 'No', 'Not Sure'],
      expectedFormat: 'Choose from: Yes (with ELCB/RCCB), Only MCB, No, or Not Sure'
    },
    {
      id: 'renovationGoal',
      label: 'Renovation or Maintenance Goal',
      type: 'choice',
      goal: 'Define service scope',
      options: ['Safety Inspection', 'Repair/Troubleshooting', 'Partial Upgrade', 'Full Rewiring', 'Automation Integration', 'New Installation', 'Other'],
      expectedFormat: 'Choose from: Safety Inspection, Repair/Troubleshooting, Partial Upgrade, Full Rewiring, Automation Integration, New Installation, or Other'
    },
    {
      id: 'budgetRange',
      label: 'Budget Range (₹)',
      type: 'choice',
      goal: 'Align scope with financial planning',
      options: ['< ₹10k', '₹10k - ₹25k', '₹25k - ₹50k', '₹50k+', 'Flexible / Need quote'],
      expectedFormat: 'Choose a budget band for the electrical work'
    },
    {
      id: 'timeline',
      label: 'Timeline / Urgency',
      type: 'choice',
      goal: 'Scheduling service priority',
      options: ['ASAP', 'This week', '1–2 weeks', 'This month', 'Flexible'],
      expectedFormat: 'Choose your preferred schedule window'
    }
  ],
};


