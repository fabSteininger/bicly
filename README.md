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

Bicly ist eine reine **Single Page Application (SPA)**. Da alle API-Anfragen (Routing, Geocoding, Karten-Tiles) direkt vom Browser an externe CORS-fähige Dienste gesendet werden und die Datenspeicherung im `localStorage` erfolgt, kann die App auf jedem statischen Webserver gehostet werden.

### Plattformen
Die App kann problemlos auf folgenden Plattformen (und vielen weiteren) betrieben werden:
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **S3 / Cloudfront**

### Deployment (allgemein)
1. In den Ordner `frontend` wechseln.
2. `npm install` und `npm run build` ausführen.
3. Den Inhalt des `dist`-Ordners auf den Webserver hochladen.

### Deployment auf Vercel
1. Repository in Vercel importieren.
2. Root Directory auf `frontend` setzen.
3. Build Command: `npm run build`
4. Output Directory: `dist`

### BRouter Self-Hosting
Die Standard-API unter `brouter.de` dient primär Testzwecken. Für den produktiven Einsatz wird dringend empfohlen, eine eigene BRouter-Instanz auf einem VPS oder dedizierten Server zu betreiben.

**Hardware-Anforderungen (Weltweite Routing-Daten):**
- **Speicherplatz:** Mindestens **250 GB SSD** (für die `.rd5` Routing-Daten der gesamten Welt).
- **Arbeitsspeicher (RAM):** Mindestens **8 GB**, empfohlen sind **16 GB** für einen flüssigen Betrieb.
- **CPU:** Ein moderner Mehrkern-Prozessor beschleunigt die Generierung der Routing-Daten.

### Umgebungsvariablen
- `VITE_BROUTER_DIRECT_URL`: Hier sollte die URL der eigenen BRouter-Instanz eingetragen werden (z.B. `https://dein-server.de/brouter`). Default: `https://brouter.de/brouter`.
