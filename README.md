# IDRMS v3 — Integrated Disaster Risk Management System
**Barangay Kauswagan, Cagayan de Oro City**

## Project Structure

```
src/
├── styles/                  ← All CSS, split by concern
│   ├── index.css            ← Master import file
│   ├── base/
│   │   ├── reset.css
│   │   ├── variables.css    ← Design tokens / CSS custom properties
│   │   └── typography.css
│   ├── layout/
│   │   ├── app.css          ← App shell, page headers, dashboard grids
│   │   ├── sidebar.css
│   │   └── topbar.css
│   ├── components/
│   │   ├── buttons.css
│   │   ├── cards.css        ← Cards, badges, stat cards
│   │   ├── forms.css        ← Inputs, modals, form grids
│   │   └── tables.css       ← Tables, activity log
│   └── pages/
│       ├── login.css
│       ├── dashboard.css
│       ├── map.css          ← Leaflet map overrides
│       ├── incidents.css
│       ├── alerts.css       ← Alert cards + SMS dropdown
│       ├── evacuation.css
│       ├── residents.css    ← SMS recipient dropdown
│       ├── resources.css
│       ├── reports.css
│       ├── risk.css         ← Risk gauge, bars, ML model note
│       ├── users.css
│       └── activity.css
├── pages/                   ← One .jsx per route
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── MapPage.jsx
│   ├── IncidentsPage.jsx
│   ├── AlertsPage.jsx
│   ├── EvacuationPage.jsx
│   ├── ResidentsPage.jsx
│   ├── ResourcesPage.jsx
│   ├── ReportsPage.jsx
│   ├── RiskIntelligencePage.jsx
│   ├── UsersPage.jsx
│   └── ActivityLogPage.jsx
├── components/
│   ├── Shared.jsx           ← Barrel export for UI components
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   └── ui/
│       ├── Badge.jsx
│       ├── ConfirmModal.jsx
│       ├── RiskBar.jsx
│       └── StatCard.jsx
├── context/
│   ├── AppContext.jsx
│   └── WeatherContext.jsx
├── hooks/
│   ├── useClock.js
│   ├── useLocalData.js      ← Supabase CRUD store
│   ├── useModal.js
│   ├── useRiskEngine.js
│   ├── useSearch.js
│   └── useWeather.js
├── data/
│   ├── constants.js         ← Re-exports from zones.js + options.js
│   ├── options.js
│   └── zones.js
├── lib/
│   └── supabase.js
├── App.jsx
└── main.jsx
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your Supabase URL + anon key

# 3. Run database schema
# Paste supabase_schema.sql into Supabase → SQL Editor → Run

# 4. Start dev server
npm run dev
```

## CSS Architecture

Each CSS file is scoped to its purpose:
- **base/** — Tokens, reset, typography (no classes, just variables & element styles)
- **layout/** — Shell, sidebar, topbar, dashboard grid utilities
- **components/** — Reusable classes: buttons, cards, badges, forms, tables, modals
- **pages/** — Page-specific classes only (overrides, unique layouts)

All pages import CSS globally via `main.jsx → styles/index.css`. No inline `<style>` tags needed.
