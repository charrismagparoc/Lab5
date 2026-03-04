export const ZONES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6']

export const ZONE_FLOOD_RISK = {
  'Zone 1': 'low',
  'Zone 2': 'medium',
  'Zone 3': 'high',
  'Zone 4': 'low',
  'Zone 5': 'high',
  'Zone 6': 'medium',
}

export const ZONE_COORDS = {
  'Zone 1': { lat: 8.4945, lng: 124.6415 },
  'Zone 2': { lat: 8.4932, lng: 124.6462 },
  'Zone 3': { lat: 8.4908, lng: 124.6508 },
  'Zone 4': { lat: 8.4893, lng: 124.6478 },
  'Zone 5': { lat: 8.4872, lng: 124.6448 },
  'Zone 6': { lat: 8.4860, lng: 124.6502 },
}

export const ZONE_SUBDIVISIONS = {
  'Zone 1': [
    { name: 'Purok 1-A', lat: 8.4951, lng: 124.6408 },
    { name: 'Purok 1-B', lat: 8.4940, lng: 124.6422 },
    { name: 'Upper Zone 1', lat: 8.4960, lng: 124.6401 },
  ],
  'Zone 2': [
    { name: 'Purok 2-A', lat: 8.4938, lng: 124.6455 },
    { name: 'Purok 2-B', lat: 8.4928, lng: 124.6470 },
    { name: 'Sitio Dagohoy', lat: 8.4935, lng: 124.6480 },
  ],
  'Zone 3': [
    { name: 'Purok 3-A (Riverbank)', lat: 8.4915, lng: 124.6500 },
    { name: 'Purok 3-B', lat: 8.4905, lng: 124.6515 },
    { name: 'Sitio Riverside', lat: 8.4900, lng: 124.6528 },
  ],
  'Zone 4': [
    { name: 'Purok 4-A', lat: 8.4898, lng: 124.6470 },
    { name: 'Purok 4-B', lat: 8.4888, lng: 124.6488 },
    { name: 'Sitio Bagong Silang', lat: 8.4905, lng: 124.6460 },
  ],
  'Zone 5': [
    { name: 'Purok 5-A (Hillside)', lat: 8.4880, lng: 124.6440 },
    { name: 'Purok 5-B', lat: 8.4868, lng: 124.6458 },
    { name: 'Sitio Masag', lat: 8.4862, lng: 124.6432 },
  ],
  'Zone 6': [
    { name: 'Purok 6-A', lat: 8.4868, lng: 124.6498 },
    { name: 'Purok 6-B', lat: 8.4855, lng: 124.6510 },
    { name: 'Sitio Bagumbayan', lat: 8.4875, lng: 124.6515 },
  ],
}

export const ZONE_RISK_DATA = [
  { zone: 'Zone 1', riskLevel: 'Low',    mainHazard: 'Fire',      flood: 'Low',    landslide: 'Low',    storm: 'Medium', baseRiskScore: 25, population: 812, description: 'Relatively elevated area, lower flood exposure. Primary risk is fire during dry season.' },
  { zone: 'Zone 2', riskLevel: 'Medium', mainHazard: 'Flood',     flood: 'Medium', landslide: 'Low',    storm: 'Medium', baseRiskScore: 42, population: 634, description: 'Near creek tributary. Moderate flood exposure during heavy rainfall.' },
  { zone: 'Zone 3', riskLevel: 'High',   mainHazard: 'Flood',     flood: 'High',   landslide: 'Medium', storm: 'High',   baseRiskScore: 78, population: 958, description: 'Adjacent to Cagayan River. High flood risk especially during typhoon season (June–November).' },
  { zone: 'Zone 4', riskLevel: 'Low',    mainHazard: 'Storm',     flood: 'Low',    landslide: 'Low',    storm: 'Low',    baseRiskScore: 18, population: 521, description: 'Inland location with good elevation. Lowest overall risk zone.' },
  { zone: 'Zone 5', riskLevel: 'High',   mainHazard: 'Landslide', flood: 'High',   landslide: 'High',   storm: 'High',   baseRiskScore: 82, population: 743, description: 'Hillside terrain with steep slopes. Dual hazard: landslide and flash flood.' },
  { zone: 'Zone 6', riskLevel: 'Medium', mainHazard: 'Storm',     flood: 'Medium', landslide: 'Medium', storm: 'Medium', baseRiskScore: 48, population: 602, description: 'Mixed terrain. Moderate risk from storm surge and surface runoff.' },
]

export const ZONE_RECOMMENDATIONS = {
  'Zone 1': 'Maintain evacuation drills. Check drainage monthly. Conduct fire safety seminars.',
  'Zone 2': 'Pre-position emergency supplies. Monitor creek levels daily during rainy season.',
  'Zone 3': 'Mandatory pre-emptive evacuation planning. Deploy flood sensors near Cagayan River. Priority response zone.',
  'Zone 4': 'Conduct community awareness programs. Maintain first-aid inventory. Consider as primary evacuation destination.',
  'Zone 5': 'HIGH PRIORITY. Pre-evacuation recommended. Keep rescue teams on standby during heavy rain. Prohibit new construction on steep slopes.',
  'Zone 6': 'Monitor river and slope stability. Update resident contact lists. Install early warning sirens.',
}
