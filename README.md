# Bicly

Bicly is a **Frontend-only** cycling app without login or backend.

## Stack

- **Frontend**: React + Vite + MapLibre GL
- **Map Tiles**: OpenFreeMap (Dark/Light)
- **Routing**: Direct via public BRouter (`https://brouter.de/brouter`)
- **Geocoding**: Nominatim search
- **Storage**: Local browser storage (`localStorage`)

## Features

- Route planning with MapLibre and waypoints
- GPX generation via BRouter with **accurate filtered elevation stats**
- Elevation profile with slope-based coloring and interactive hover
- Route statistics including travel time, energy consumption, and **Gummibärchen count** 🧸
- Toggleable Points of Interest (Drinking water, Toilets)
- Quick GPX export button in the header
- Save GPX locally (no account/login needed)
- Upload your own GPX files and manage them in your local library
- Load routes from your local library back onto the map

## Screenshots

### Planner (Light Mode)
![Planner Light](frontend/public/screenshots/planner-light.png)

### Planner (Dark Mode)
![Planner Dark](frontend/public/screenshots/planner-dark.png)

### Planner Sidebar
![Planner Sidebar](frontend/public/screenshots/planner-sidebar.png)

### Library
![Library](frontend/public/screenshots/library.png)

### Settings
![Settings](frontend/public/screenshots/settings.png)

## Start Locally

### npm
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

### Docker Compose
Bicly can be started together with a local BRouter instance using Docker Compose:

1. **Download routing segments:**
   Create a folder `brouter/segments4` and download the `.rd5` files for your region from [brouter.de/brouter/segments4/](https://brouter.de/brouter/segments4/).
2. **Start services:**
   ```bash
   docker-compose up -d
   ```
3. **Access Bicly:**
   The app is available at `http://localhost` (port 80) and `https://localhost` (port 443).

### Customizing Legal Content (Docker)
You can customize the Privacy Policy and Impressum in the Docker container in two ways:

- **Environment Variables:** Set `PRIVACY_MD` and `IMPRESSUM_MD` in `docker-compose.yml`.
- **Volume Mounts:** Uncomment the `volumes` section in `docker-compose.yml` and provide your own `privacy.md` and `impressum.md` files in the root directory.

## Static Hosting

Bicly is a pure **Single Page Application (SPA)**. Since all API requests (routing, geocoding, map tiles) are sent directly from the browser to external CORS-enabled services, and data storage happens in `localStorage`, the app can be hosted on any static web server.

### Platforms
The app can be easily run on the following platforms (and many others):
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **S3 / Cloudfront**

### Deployment (General)
1. Navigate to the `frontend` directory.
2. Run `npm install` and `npm run build`.
3. Upload the contents of the `dist` folder to your web server.

### Deployment on Vercel
1. Import the repository into Vercel.
2. Set the Root Directory to `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`

### BRouter Self-Hosting
The default API at `brouter.de` is primarily for testing. For production use, it is strongly recommended to run your own BRouter instance on a VPS or dedicated server.

**Hardware Requirements (for operation):**
- **Storage:** approx. **50 GB** for `.rd5` routing data for the entire world.
- **RAM:** At least **512 MB**.
- **CPU:** A single CPU core is sufficient.

### Environment Variables
- `VITE_BROUTER_DIRECT_URL`: Enter the URL of your own BRouter instance here (e.g., `https://your-server.com/brouter`). Default: `https://brouter.de/brouter`.
