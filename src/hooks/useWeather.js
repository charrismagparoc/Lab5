import { useState, useEffect } from 'react'

const KAUSWAGAN_LAT  = 8.4922
const KAUSWAGAN_LNG  = 124.6498
const OWM_API_KEY    = 'bd5e378503939ddaee76f12ad7a97608'
const FETCH_INTERVAL = 10 * 60 * 1000

function assessRisk(weatherCode, windKph, rainMm) {
  if (weatherCode >= 200 && weatherCode < 300) return 'high'
  if ((weatherCode >= 500 && weatherCode < 600) && rainMm > 10) return 'high'
  if ((weatherCode >= 500 && weatherCode < 600) && rainMm > 5)  return 'medium'
  if (weatherCode >= 300 && weatherCode < 400) return 'medium'
  if (weatherCode >= 500 && weatherCode < 600) return 'medium'
  if (windKph > 50) return 'high'
  if (windKph > 30) return 'medium'
  return 'low'
}

function getIcon(weatherCode) {
  if (weatherCode >= 200 && weatherCode < 300) return 'fa-bolt'
  if (weatherCode >= 300 && weatherCode < 400) return 'fa-cloud-drizzle'
  if (weatherCode >= 500 && weatherCode < 600) return 'fa-cloud-showers-heavy'
  if (weatherCode >= 600 && weatherCode < 700) return 'fa-snowflake'
  if (weatherCode >= 700 && weatherCode < 800) return 'fa-smog'
  if (weatherCode === 800) return 'fa-sun'
  if (weatherCode === 801) return 'fa-cloud-sun'
  return 'fa-cloud'
}

function formatTemp(kelvin) { return Math.round(kelvin - 273.15) }
function kphFromMs(ms)      { return Math.round(ms * 3.6) }

const FALLBACK = {
  temp: 29, feels: 30, humidity: 78,
  condition: 'Partly Cloudy', description: 'partly cloudy',
  windKph: 14, icon: 'fa-cloud-sun',
  riskLevel: 'Low', isSunny: false,
  rainMm: 0, source: 'fallback',
  location: 'Barangay Kauswagan, CDO',
}

export function useWeather() {
  const [weather, setWeather] = useState(FALLBACK)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchWeather = async () => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${KAUSWAGAN_LAT}&lon=${KAUSWAGAN_LNG}&appid=${OWM_API_KEY}`
      const res = await window.fetch(url)
      if (!res.ok) throw new Error('OWM API error')
      const d = await res.json()

      const temp      = formatTemp(d.main.temp)
      const feels     = formatTemp(d.main.feels_like)
      const humidity  = d.main.humidity
      const condition = d.weather[0].main
      const desc      = d.weather[0].description
      const code      = d.weather[0].id
      const windKph   = kphFromMs(d.wind.speed)
      const rainMm    = d.rain?.['1h'] || d.rain?.['3h'] || 0
      const icon      = getIcon(code)
      const risk      = assessRisk(code, windKph, rainMm)
      const isSunny   = code === 800 || code === 801

      setWeather({
        temp, feels, humidity,
        condition, description: desc,
        windKph, icon,
        riskLevel: risk.charAt(0).toUpperCase() + risk.slice(1),
        isSunny, rainMm, source: 'live',
        location: 'Barangay Kauswagan, CDO',
        raw: d,
      })
      setLastFetched(new Date())
    } catch {
      // Keep last known or fallback
    }
  }

  useEffect(() => {
    fetchWeather()
    const t = setInterval(fetchWeather, FETCH_INTERVAL)
    return () => clearInterval(t)
  }, []) 

  return { ...weather, lastFetched, temperature: weather.temp, windSpeed: weather.windKph, rainfall1h: weather.rainMm }
}
