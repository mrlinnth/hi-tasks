# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Serve the app locally:**
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .
```

Then navigate to `http://localhost:8000`

**No build/compile step required** - this is a vanilla JavaScript PWA with no framework or bundler.

## Architecture Overview

This is a lightweight, offline-capable PWA todo application built with vanilla JavaScript and backed by Cockpit CMS.

### Technology Stack
- Pure vanilla JavaScript (ES6 modules)
- Cockpit CMS for backend API
- IndexedDB for offline storage
- Service Worker for caching and offline support
- Pure CSS with CSS variables for theming
- LocalStorage for API token persistence

### Core Module Structure

**app.js** - Main application controller
- `TodoApp` class manages the entire UI lifecycle
- Coordinates between db, api, and sync modules
- Handles all user interactions and UI updates
- Manages both online and offline states

**api.js** - Cockpit CMS API wrapper
- `CockpitAPI` class handles all server communication
- API token stored in localStorage (key: `cockpit_api_token`)
- Base URL: `https://cms.hiyan.xyz/:hi-tasks/api`
- Content model name: `tasks`
- All requests include `api-key` header

**db.js** - IndexedDB wrapper
- Database name: `TodoPWA`
- Two object stores:
  - `tasks` - stores task data (keyPath: `_id`)
  - `syncQueue` - stores pending operations for offline sync
- Provides simple Promise-based API for CRUD operations

**sync.js** - Offline sync manager
- `SyncManager` class handles queue-based sync
- Listens to online/offline events
- Processes queued operations when connection returns
- Uses "last write wins" strategy

**sw.js** - Service worker
- Cache-first strategy for app assets
- Network passthrough for API requests
- Cache name: `todo-pwa-v1`

### Task Data Model

Tasks have the following fields:
```javascript
{
  _id: string,          // Server-assigned ID (or temp_${timestamp} for offline)
  title: string,        // Required
  completed: boolean,   // Default: false
  important: boolean,   // Default: false
  dueDate: string|null, // ISO date string
  description: string   // Optional
}
```

### Offline Sync Flow

**Online mode:**
1. User action → Update IndexedDB
2. Call API immediately
3. Update UI on success

**Offline mode:**
1. User action → Update IndexedDB
2. Add operation to sync queue
3. Update UI immediately
4. When online, queue processes automatically

Queue operations: `create`, `update`, `delete`

### API Configuration

API token is configured through the UI (Settings panel, ⚙ icon), not hardcoded in files.

For Cockpit Spaces, update `API_URL` in api.js:
```javascript
const API_URL = 'https://cms.hiyan.xyz/:your-space-name/api';
```

### Cockpit CMS Content Model

The `tasks` content model in Cockpit must have these exact fields:
- `title` - Text (required)
- `completed` - Boolean (default: false)
- `important` - Boolean (default: false)
- `dueDate` - Date (optional)
- `description` - Textarea (optional)

### UI Components

**Main views:**
- Task list with sorting (incomplete → important → due date)
- Task detail sidebar (right panel on desktop, full screen on mobile)
- Settings panel (accessible via ⚙ icon)

**Task sorting logic** (app.js:129-136):
1. Incomplete tasks first
2. Important tasks first (within completed/incomplete groups)
3. Due date ascending (within importance groups)

### Key Implementation Details

- Tasks with temp IDs (`temp_${timestamp}`) are created offline
- Service worker skips API requests to allow natural offline error handling
- Sync status indicator shows: Online, Offline, or Syncing
- Settings panel validates API token by attempting to fetch tasks
- HTML is escaped when rendering task titles (app.js:407-411)
- Due dates are formatted as "Today", "Tomorrow", or "Mon DD" (app.js:388-405)
