# Bicly

Find cycling routes with ease and share them with your friends, or load them onto your cycling computer.

## Stack

- **Backend**: PocketBase (auth, file storage, social graph, sharing ACL, profile management)
- **Routing engine**: BRouter (GPX route generation from waypoint chains)
- **Frontend**: React + Vite + MapLibre GL
- **Map tiles/style**: OpenFreeMap vector style (`liberty`)

## Features implemented

- User authentication via PocketBase auth users collection.
- Friend graph via `users.friends` relation field.
- GPX storage in `route_files` collection.
- Two sharing patterns:
  - Per-file friend sharing using `file_shares` collection.
  - Share-to-all-friends toggle (`route_files.is_shared_to_all_friends`).
- Route generation by:
  - Uploading existing GPX files.
  - Creating routes from map pins that are sent to BRouter.
- Drag-and-drop waypoint ordering in the UI, with dynamic route regeneration after waypoint add/reorder/remove.
- Routing profile support in UI via `routing_profiles` collection.
- Admin-extensible profile list via `admin_can_publish_profiles` flag on users.

## Project structure

- `backend/pb_migrations/1700000000_init.js`: PocketBase collections and access rules.
- `backend/pb_hooks/main.pb.js`: custom PocketBase endpoints for BRouter proxy and friend-sharing helper.
- `frontend/`: Vite React app with MapLibre waypoint planner.
- `docker-compose.yml`: local development setup for PocketBase + BRouter + frontend.

## Run locally

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- PocketBase: `http://localhost:8090/_/`
- BRouter: `http://localhost:17777`

## Notes

1. Create initial users in PocketBase admin UI.
2. Set user `admin_can_publish_profiles=true` for users who should create/edit routing profiles.
3. Seed `routing_profiles` (e.g. `trekking`, `fastbike`, `shortest`) to expose profile options in the planner.
4. The frontend expects PocketBase auth context (`pb.authStore`) before saving/uploading routes.
