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

## Statisches Hosting

Bicly ist eine reine **Single Page Application (SPA)**. Da alle API-Anfragen (Routing, Geocoding, Karten-Tiles) direkt vom Browser an externe CORS-fähige Dienste gesendet werden und die Datenspeicherung im `localStorage` erfolgt, kann die App auf jedem statischen Webserver gehostet werden (z. B. GitHub Pages, Netlify, Vercel, S3).

### Deployment (allgemein)
1. In den Ordner `frontend` wechseln.
2. `npm install` und `npm run build` ausführen.
3. Den Inhalt des `dist`-Ordners auf den Webserver hochladen.

### Deployment auf Vercel
1. Repository in Vercel importieren.
2. Root Directory auf `frontend` setzen.
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Umgebungsvariablen
- `VITE_BROUTER_DIRECT_URL` (Optional, Default: `https://brouter.de/brouter`)
