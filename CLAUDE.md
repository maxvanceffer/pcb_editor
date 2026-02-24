# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PCB Editor — a full-stack web application for designing printed circuit board layouts (perfboard/stripboard). Monorepo with independent frontend and backend.

## Commands

### Backend (AdonisJS v6, port 7050)

```bash
cd backend && node ace serve          # Dev server with HMR
cd backend && node ace migration:run  # Run database migrations
cd backend && npm test                # Run tests (Japa)
cd backend && npm run lint            # ESLint
cd backend && npm run typecheck       # TypeScript type checking
cd backend && npm run build           # Production build
```

### Frontend (Vue 3 + Vite, port 7060)

```bash
cd frontend && npm run dev     # Dev server
cd frontend && npm run build   # Production build (output to dist/)
```

## Architecture

### Data Flow

```
MySql (backend) → API (AdonisJS REST) → Axios (frontend) → Pinia stores (shallowRef) → PCBBoard.vue (SVG render)
```

User edits in SVG canvas mutate OOP class instances, then `projectStore.notifyElementChanged()` triggers reactive updates, and `projectStore.saveProject()` serializes to JSON and sends `PUT /api/projects/:id`.

### OOP Component Hierarchy

All board elements live in `frontend/src/lib/components/`:

- **`BaseComponent`** — abstract base with `position`, `rotation`, `getOccupiedHoles()`, `getAbsolutePinPositions()`, `serialize()`
- Concrete components: `ESP32S3`, `JSTConnector`, `AMS1117`, `BatteryHolder`, `IRReceiver`, `LED`
- **`WireTrace`** — not a BaseComponent, but an `AnyElement`. Has `waypoints`, `crossings`, `sharedHoles`
- **`ComponentFactory`** — deserializes `SerializedElement[]` from JSON back to OOP instances

### Pinia Stores

- **`projectStore`** — `elements: shallowRef<AnyElement[]>` (must use `shallowRef`, not `ref` — preserves prototype chain of OOP instances). After mutating position/rotation, call `notifyElementChanged()` (triggerRef).
- **`editorStore`** — UI state: zoom/pan, active tool (`select|hand|wire`), drag state, selected element, pin labels, component descriptions, hidden elements. Constants: `HOLE_SPACING=24`, `MARGIN_LEFT=36`, `MARGIN_TOP=36`.
- **`historyStore`** — undo/redo via action objects (add/remove/move/rotate)
- **`authStore`** — Bearer token in localStorage, set on all Axios requests via interceptor
- **`settingsStore`** — theme and locale, synced with backend

### PCBBoard.vue

Main SVG canvas (`frontend/src/components/board/PCBBoard.vue`). Handles all mouse interactions (drag-drop from sidebar, canvas drag, wire tool, context menu, zoom/pan). Renders board holes, component rectangles, wire polylines. Converts between pixel coords and grid coords via editorStore helpers.

### Backend API

Routes defined in `backend/start/routes.ts`. All project routes require auth (`middleware: [auth()]`). Project model stores `boardConfig`, `elements` (serialized), `pinUserLabels`, `componentDescriptions` as JSON columns.

OAuth (Google, GitHub) handled via `@adonisjs/ally`. Frontend receives token via URL redirect after OAuth.

### Serialization

Each component implements `serialize(): SerializedElement` (id, type, position, rotation + type-specific fields). `ComponentFactory.create()` restores OOP instances from serialized data.

## Key Patterns

- **`shallowRef`** for `elements` array — not `ref`, which would break the prototype chain of OOP instances
- After mutating `position`/`rotation` — call `projectStore.notifyElementChanged()` (triggerRef)
- shadcn-vue `Select`: `@update:model-value="(v) => fn(parseFloat(String(v ?? '2.54')))"`
- shadcn-vue `Slider`: `@update:model-value="(v) => fn((v ?? [100])[0] ?? 100)"`
- API proxy: Vite dev server (`/api/*`) proxies to `localhost:7050`
- CORS: backend allows `localhost:5173` and `localhost:7060`

## Deployment

Railway: backend serves built frontend from `public/` (SPA fallback in routes.ts). Health check at `GET /api/health`. Frontend build injects git hash as `__APP_VERSION__` for update detection.

## Others

All comments in the code must in english language
