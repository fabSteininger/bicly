# Bicly

Bicly ist jetzt eine **Frontend-only** Cycling-App ohne Login/Backend.

## Stack

- **Frontend**: React + Vite + MapLibre GL
- **Routing**: Direkt über öffentlichen BRouter (`https://brouter.de/brouter`)
- **Geocoding**: Nominatim Suche
- **Speicherung**: lokale Browser-Speicherung (`localStorage`)

## Features

- Routenplanung mit MapLibre und Wegpunkten
- GPX-Generierung über BRouter
- GPX lokal speichern (ohne Account/Login)
- Eigene GPX-Dateien hochladen und lokal in der Bibliothek verwalten
- Route aus lokaler Bibliothek wieder auf Karte laden

## Lokal starten

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Deployment auf Vercel

1. Repository in Vercel importieren.
2. Root Directory auf `frontend` setzen.
3. Build Command: `npm run build`
4. Output Directory: `dist`

Optionale Env-Variable:

- `VITE_BROUTER_DIRECT_URL` (Default: `https://brouter.de/brouter`)
