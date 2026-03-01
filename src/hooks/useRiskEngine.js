import { useMemo } from 'react'
import { ZONE_RISK_DATA } from '../data/zones'

const ZONE_BASE_SCORE = {
  'Zone 1': 25, 'Zone 2': 42, 'Zone 3': 78,
  'Zone 4': 18, 'Zone 5': 82, 'Zone 6': 48,
}

const VULNERABILITY_WEIGHTS = {
  'Bedridden': 12, 'PWD': 10, 'Senior Citizen': 8,
  'Pregnant': 8, 'Infant': 7,
}

// How much each incident severity adds to the zone score
const INCIDENT_SEVERITY_SCORE = {
  'High':   20,
  'Medium': 10,
  'Low':    4,
}

function isRainySeason() {
  const month = new Date().getMonth() + 1
  return month >= 6 && month <= 11
}

export function scoreResident(resident, zoneIncidentCount = 0, weather = {}) {
  let score = 0
  score += ZONE_BASE_SCORE[resident.zone] || 30
  const vulnScore = (resident.vulnerabilityTags || []).reduce((acc, tag) => acc + (VULNERABILITY_WEIGHTS[tag] || 5), 0)
  score += Math.min(vulnScore, 40)
  if (resident.evacuationStatus === 'Unaccounted') score += 18
  else if (resident.evacuationStatus === 'Evacuated') score -= 15
  const members = parseInt(resident.householdMembers) || 1
  score += Math.min((members - 1) * 1.8, 12)
  score += Math.min(zoneIncidentCount * 6, 20)
  if (weather.riskLevel === 'High')        score += 15
  else if (weather.riskLevel === 'Medium') score += 7
  if (isRainySeason()) score += 8
  return Math.min(Math.max(Math.round(score), 0), 100)
}

export function getRiskLabel(score) {
  if (score >= 70) return { label: 'HIGH',   cls: 'bd-danger',  color: 'var(--red)',    band: 'danger' }
  if (score >= 40) return { label: 'MEDIUM', cls: 'bd-warning', color: 'var(--orange)', band: 'warning' }
  return               { label: 'LOW',    cls: 'bd-success', color: 'var(--green)',  band: 'success' }
}

export function scoreZone(zoneName, residents, incidents, weather) {
  const zoneResidents = residents.filter(r => r.zone === zoneName)
  // Only count active/pending incidents — resolved ones reduce risk
  const activeInc     = incidents.filter(i => i.zone === zoneName && ['Active', 'Pending', 'Verified', 'Responded'].includes(i.status))
  const baseScore     = ZONE_BASE_SCORE[zoneName] || 30
  const vulnCount     = zoneResidents.filter(r => (r.vulnerabilityTags || []).length > 0).length
  const unaccounted   = zoneResidents.filter(r => r.evacuationStatus === 'Unaccounted').length

  let score = baseScore

  // Add severity-weighted score for each active incident
  const incidentScore = activeInc.reduce((acc, inc) => acc + (INCIDENT_SEVERITY_SCORE[inc.severity] || 6), 0)
  score += Math.min(incidentScore, 30)

  score += Math.min(vulnCount * 1.5, 15)
  score += Math.min(unaccounted * 3, 12)
  if (weather?.riskLevel === 'High')        score += 12
  else if (weather?.riskLevel === 'Medium') score += 5
  if (isRainySeason()) score += 6
  return Math.min(Math.max(Math.round(score), 0), 100)
}

// Count ALL incidents by severity (all statuses) for the Risk Intelligence KPI cards
export function getIncidentRiskCounts(incidents) {
  return {
    highIncidents:   incidents.filter(i => i.severity === 'High').length,
    mediumIncidents: incidents.filter(i => i.severity === 'Medium').length,
    lowIncidents:    incidents.filter(i => i.severity === 'Low').length,
    totalActive:     incidents.filter(i => ['Active', 'Pending', 'Verified', 'Responded'].includes(i.status)).length,
  }
}

export function useRiskEngine(residents, incidents, weather) {
  const zoneIncidentCount = useMemo(() => {
    const counts = {}
    incidents
      .filter(i => ['Active', 'Pending', 'Verified', 'Responded'].includes(i.status))
      .forEach(i => { counts[i.zone] = (counts[i.zone] || 0) + 1 })
    return counts
  }, [incidents])

  const residentRisks = useMemo(() =>
    residents.map(r => {
      const score = scoreResident(r, zoneIncidentCount[r.zone] || 0, weather)
      const risk  = getRiskLabel(score)
      return { ...r, score, riskLabel: risk.label, riskCls: risk.cls, riskColor: risk.color }
    }).sort((a, b) => b.score - a.score)
  , [residents, zoneIncidentCount, weather])

  const zoneRisks = useMemo(() =>
    ZONE_RISK_DATA.map(z => {
      const score    = scoreZone(z.zone, residents, incidents, weather)
      const risk     = getRiskLabel(score)
      const zoneRes  = residents.filter(r => r.zone === z.zone)
      const zoneInc  = incidents.filter(i => i.zone === z.zone)
      return {
        ...z,
        computedScore:    score,
        riskLabel:        risk.label,
        riskCls:          risk.cls,
        riskColor:        risk.color,
        totalResidents:   zoneRes.length,
        vulnerableCount:  zoneRes.filter(r => (r.vulnerabilityTags || []).length > 0).length,
        evacuatedCount:   zoneRes.filter(r => r.evacuationStatus === 'Evacuated').length,
        unaccountedCount: zoneRes.filter(r => r.evacuationStatus === 'Unaccounted').length,
        activeIncidents:  zoneInc.filter(i => ['Active', 'Pending', 'Verified', 'Responded'].includes(i.status)).length,
        totalIncidents:   zoneInc.length,
        // Incident severity breakdown per zone
        highIncidents:    zoneInc.filter(i => i.severity === 'High'   && ['Active','Pending','Verified','Responded'].includes(i.status)).length,
        mediumIncidents:  zoneInc.filter(i => i.severity === 'Medium' && ['Active','Pending','Verified','Responded'].includes(i.status)).length,
        lowIncidents:     zoneInc.filter(i => i.severity === 'Low'    && ['Active','Pending','Verified','Responded'].includes(i.status)).length,
      }
    }).sort((a, b) => b.computedScore - a.computedScore)
  , [residents, incidents, weather])

  const highCount    = residentRisks.filter(r => r.riskLabel === 'HIGH').length
  const mediumCount  = residentRisks.filter(r => r.riskLabel === 'MEDIUM').length
  const lowCount     = residentRisks.filter(r => r.riskLabel === 'LOW').length
  const overallScore = useMemo(() => {
    const active = incidents.filter(i => ['Active','Pending','Verified','Responded'].includes(i.status))
    const highAct = active.filter(i => i.severity === 'High').length
    const medAct  = active.filter(i => i.severity === 'Medium').length
    