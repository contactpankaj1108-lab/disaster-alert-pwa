# PROJECT MEMORY & STATE SNAPSHOT
**Project:** Disaster Alert & Emergency Resource Progressive Web App (PWA)  
**Type:** 100% Software-Only (Zero Hardware / Zero External IoT / No Physical GPS)  
**Location:** `C:\Users\Preeti\disaster-alert-pwa`  
**Dev Server:** `http://localhost:5173/` (Vite + React 19 + JavaScript)  
**Snapshot Date:** September 22, 2026  

---

## 1. Executive Summary & Progress

This project is an offline-first, client-side disaster warning and emergency resource locator application designed to run seamlessly on Windows laptops and modern Chromium browsers.

### Roadmap Progress Tracker:
- [x] **STEP 1 — Project Initialization**: Scaffolded Vite + React, created directory hierarchy, installed `leaflet` & `lucide-react`, verified clean builds.
- [x] **STEP 2 — Basic React Application**: Emergency theme in `index.css`, application shell, 4-tab navigation, network detection strip.
- [x] **STEP 3 — Dashboard UI**: Location bar, threat level indicators (🟢 Normal / 🟡 Watch / 🟠 Warning / 🔴 Emergency), weather readouts, alert highlights, quick actions.
- [x] **STEP 4 — Browser Geolocation**: `locationService.js` wrapping `navigator.geolocation`, privacy guarantees, permission badges (`GPS Allowed` / `GPS Denied` / `Prompt`), city fallback dropdown and manual custom coordinates entry.
- [x] **STEP 5 — Interactive Leaflet Map**: `ResourceMap.jsx` using direct Leaflet instance (StrictMode clean), custom offline `L.divIcon` markers for User 📍, Hospitals 🏥, Police 🚓, Fire 🚒, Shelters 🏠, popups, and recenter button. Fixed user dot visibility bug via dedicated layer & `zIndexOffset: 3000`.
- [x] **STEP 6 — Emergency Resource Dataset**: `emergencyResources.js` containing real-world datasets, Haversine spherical geodesic distance engine ($R = 6371\text{ km}$), proximity badge tags (`📍 850 m away`), and "Closest First" vs "Alphabetical" sorting.
- [x] **STEP 7 — Disaster / Weather API Integration**: Built `weatherApi.js` (Open-Meteo & WMO decoding), `disasterApi.js` (USGS earthquakes & meteorological rule engine), and `alertService.js` with tight timeouts (4s) and automatic offline fallback caching.
- [x] **STEP 8 — Intelligent Alert Processing**: Built `alertProcessor.js` with standard schema normalization, automated protective action synthesis, signature-based deduplication, severity-weighted prioritization, and full search & filtering on the Alerts page.
- [x] **STEP 9 — Local Storage & Caching Layer**: Built `cacheService.js` implementing dual-layer storage (IndexedDB with automatic LocalStorage fallback), cache freshness tracking (`cacheAgeMinutes`), instant offline boot hydration, location preference persistence, and an interactive `CacheDiagnostics.jsx` storage inspector.
- [x] **STEP 10 — Service Worker & Web App Manifest (PWA)**: Built `public/sw.js` (Cache-First app shell + Network-First API strategy), compliant `public/manifest.json` with 192x192 & 512x512 standard & maskable PNG icons, registered service worker in `main.jsx`, and added custom `InstallPwaButton.jsx` in the top header.
- [x] **STEP 11 — Offline Mode & Network Throttling Verification**: Built `OfflineBanner.jsx` with real-time cache age timestamps, emergency phone shortcuts (112/108), and an in-app **"⚡ Simulate Offline Mode"** presentation toggle that intercepts network requests without unplugging Wi-Fi.
- [x] **STEP 12 — Low-Bandwidth Optimization**: Implemented Network Quality detection (2G/3G/4G tiers), 250ms debounced search on facilities & alerts, network rate-limiting guard (45s throttle), and a persistent **"⚡ Data Saver"** mode that disables animations and heavy paints.
- [x] **STEP 13 — Comprehensive Error Handling & Fault Tolerance**: Built `ErrorBoundary.jsx` (crisis recovery UI with one-click direct telephone links `112`/`108`, app reload, and safe cache wipe), `validators.js` (strict mathematical coordinate boundaries [-90 to 90 lat, -180 to 180 lon] and XSS-safe input sanitization), `errorHandler.js` (network timeout/rate-limit/503 classifier), and bound coordinate validation to `LocationStatus.jsx`. Clean production build verified.
- [x] **STEP 14 — Testing Checklist & Validation**: Automated CLI test suite in `scripts/test-runner.js` (`npm test`) with 20/20 unit/integration tests passing; in-app live verification suite (`SystemDiagnostics.jsx`) in Dashboard; comprehensive 15-scenario test matrix documented in `TESTING_CHECKLIST.md`.
- [ ] **STEP 15 — Final Production Build & Presentation Deliverables** *(Next step)*

---

## 2. Project Architecture & File Inventory

```
disaster-alert-pwa/
│
├── public/
│   ├── icons/                    # 192x192 and 512x512 PWA icons (PNG)
│   ├── favicon.svg               # SVG Shield & Lightning favicon
│   ├── manifest.json             # Web App Manifest (PWA standard)
│   └── sw.js                     # Cache-First shell + Network-First API Service Worker
│
├── src/
│   ├── components/
│   │   ├── AlertCard.jsx         # Formatted disaster alert card with severity colors & protective steps
│   │   ├── CacheDiagnostics.jsx  # Live IndexedDB & LocalStorage inspection modal & wipe tool
│   │   ├── Dashboard.jsx         # Unified emergency dashboard with telemetry & shortcuts
│   │   ├── ErrorBoundary.jsx     # Full-page crash shield with emergency hotlines (112, 108)
│   │   ├── InstallPwaButton.jsx  # Native browser install prompt trigger (beforeinstallprompt)
│   │   ├── LocationStatus.jsx    # Geolocation status bar, permission pills, validated coordinate inputs
│   │   ├── NetworkStatus.jsx     # Online/offline detector with 2G/3G/4G quality tier & offline simulation switch
│   │   ├── OfflineBanner.jsx     # Persistent amber offline alert with cache freshness and phone dialer
│   │   ├── ResourceFilter.jsx    # Search input and category filter toggles
│   │   └── ResourceMap.jsx       # Interactive Leaflet map with offline divIcons and z-indexed radar dot
│   │
│   ├── data/
│   │   └── emergencyResources.js # Verified facilities dataset + Haversine distance engine
│   │
│   ├── pages/
│   │   ├── Alerts.jsx            # Public alerts feed page with debounced search & severity chips
│   │   ├── Home.jsx              # Dashboard root view with quick telemetry and recent notices
│   │   ├── Resources.jsx         # Split map + facilities directory with closest-first sorting
│   │   └── Safety.jsx            # Offline-cached safety protocols (Flood, Earthquake, Fire, Storm)
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── weatherApi.js     # Open-Meteo current weather and WMO weather codes
│   │   │   └── disasterApi.js    # USGS seismic feed + microclimate meteorological rules
│   │   ├── alertProcessor.js     # Schema normalization, deduplication, protective actions
│   │   ├── alertService.js       # Orchestration pipeline with 4s timeouts & local cache fallback
│   │   ├── cacheService.js       # IndexedDB + LocalStorage storage driver with cache age tracking
│   │   └── locationService.js    # Browser Geolocation API wrapper & reverse geocoding
│   │
│   ├── utils/
│   │   ├── debounce.js           # 250ms debounce utility for low-bandwidth search
│   │   ├── errorHandler.js       # User-friendly network failure & status classifier
│   │   └── validators.js         # Coordinate boundary checker & input sanitization
│   │
│   ├── App.jsx                   # Global state coordinator (location, network, telemetry, views)
│   ├── index.css                 # Accessible emergency design system, data saver rules & animations
│   └── main.jsx                  # React DOM mount point wrapped with ErrorBoundary & SW registration
│
├── index.html                    # Root HTML linked with Leaflet CSS & manifest.json
├── package.json                  # React 19, Leaflet, Lucide React, Vite
├── PROJECT_MEMORY.md             # Persistent memory file
└── vite.config.js                # Vite build configuration
```

---

## 3. Key Technical Decisions & Problem Resolutions

### A. React 19 StrictMode Map Marker Detachment Bug (Resolved)
- **Problem**: In development `StrictMode`, React executes an immediate mount -> unmount -> remount cycle. On remount, the Leaflet map was recreated, but the user marker ref retained a pointer to the destroyed map instance, causing the pulsating user location dot to disappear.
- **Fix**: Created an explicit `userLayerRef` managed by `L.layerGroup()`. The layer is cleared and safely reinstantiated on every mount/location change. Added `zIndexOffset: 3000` to guarantee the user dot renders on top of all facility pins.

### B. Localized Alerts for Kharar / Tri-City vs Far Seismic Events (Resolved)
- **Problem**: User at Kharar, Punjab was seeing distant minor tremors from Uttarakhand (Joshimath) rather than local flood risks.
- **Fix**: Implemented `getLocalizedRegionalAlerts` in `disasterApi.js` ensuring that local waterlogging and thunderstorm warnings for the Kharar/Chandigarh/Mohali corridor take precedence, while distant earthquakes ($>200\text{ km}$) require $M \ge 4.2$ and are explicitly distance-tagged (e.g., `(168 km from you)`).

### C. Offline-Safe DivIcons (Resolved)
- **Strategy**: Default Leaflet marker images load from external CDNs that fail completely offline. All markers use `L.divIcon` with inline HTML/SVG and CSS badges that never make network calls.

### D. Multi-Tier Error Shield & Recovery (Resolved)
- **Strategy**: React runtime exceptions are caught by `ErrorBoundary.jsx`, displaying immediate crisis hotlines (`112` National Police/Disaster, `108` Medical Ambulance) alongside a clean storage reset button. Invalid coordinate inputs (out of range lat/lon) are caught prior to state dispatch by `validators.js`.
