# Todo PWA - Minimal Todo App

A lightweight, offline-capable PWA todo application built with vanilla JavaScript, backed by Cockpit CMS.

## Features

- ✅ Add, edit, complete, and delete tasks
- ⭐ Mark tasks as important
- 📅 Set due dates
- 📝 Add descriptions
- 🔍 Filter tasks (All, Active, Completed, Important)
- 🔄 Offline sync with queue management
- 📱 Fully responsive mobile design
- 💾 IndexedDB for local storage
- 🚀 PWA installable
- 🎨 Minimal, modern UI with sage green theme
- ⚙️ Settings panel for API token management
- 🗑️ Clear cache & data to reset the app

## Architecture

```
- Pure vanilla JavaScript (no framework)
- Cockpit CMS for backend
- IndexedDB for offline storage
- Service Worker for caching
- Pure CSS (no preprocessor)
- LocalStorage for settings
```

## Setup

### 1. Serve the App

The app needs to be served over HTTPS (or localhost) for PWA features to work.

**Option 1: Local development**
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .
```

**Option 2: Production deployment**
Upload all files to your web server (e.g., using Dokploy).

### 2. Configure API Token

**No code editing required!** Configure your Cockpit API token through the UI:

1. Open the app in your browser
2. Click the **settings gear (⚙)** in the top-right corner
3. Enter your Cockpit API token
4. Click **"Save Token"**
5. Token is validated and saved to localStorage

The token persists across sessions and is automatically loaded on app restart.

### 3. Cockpit CMS Content Model

Create a content model named `tasks` in your Cockpit CMS with these fields:

```
title        - Text (required)
completed    - Boolean (default: false)
important    - Boolean (default: false)
dueDate      - Date (optional)
description  - Textarea (optional)
```

**Important:** If using Cockpit Spaces, update the `API_URL` in `api.js`:
```javascript
const API_URL = 'https://cms.hiyan.xyz/:your-space-name/api';
```

### 4. Access the App

Navigate to `http://localhost:8000` (or your domain) and the app should load.

## File Structure

```
todo-pwa/
├── index.html          # Main HTML structure
├── styles.css          # Pure CSS styling
├── app.js              # Main application logic
├── api.js              # Cockpit CMS API wrapper
├── db.js               # IndexedDB wrapper
├── sync.js             # Offline sync manager
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── icons               # Icons directory
├──── 44.png            # App icon (42x42)
├──── 192.png           # App icon (192x192)
├──── 512.png           # App icon (512x512)
└── README.md           # This file
```

## How It Works

### Online Mode
1. User creates/edits/deletes a task
2. Changes saved to IndexedDB immediately
3. API call made to Cockpit CMS
4. UI updates on success

### Offline Mode
1. User creates/edits/deletes a task
2. Changes saved to IndexedDB immediately
3. Operation added to sync queue
4. UI updates immediately
5. When connection returns, queue processes automatically

### Sync Strategy
- Simple queue-based sync
- Last write wins
- Operations processed in order
- Failed operations retry on next online event

## Bundle Size

Approximate sizes (uncompressed):
- HTML: ~3KB
- CSS: ~9KB
- JavaScript (all): ~13KB
- **Total: ~25KB**

With gzip compression, expect ~7-9KB total transfer.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Customization

### Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary: #85a584;        /* Sage green */
    --primary-dark: #6a8a69;   /* Dark sage green */
    --text-primary: #1a1a1a;   /* Near black */
    --text-secondary: #4b5563; /* Gray */
    /* ... */
}
```

### API Endpoint
Edit in `api.js`:
```javascript
const API_URL = 'https://cms.hiyan.xyz/:hi-tasks/api';
```

## Troubleshooting

**Tasks not syncing?**
- Check API token in Settings (click ⚙ icon)
- Verify Cockpit content model matches expected fields
- Check browser console for errors

**Settings button not working?**
- Hard reload the page: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Clear browser cache and reload
- Check browser console for JavaScript errors

**PWA not installing?**
- Ensure served over HTTPS
- Check manifest.json is accessible
- Verify icons exist

**Offline mode not working?**
- Check if service worker registered (Console > Application > Service Workers)
- Clear cache and reload
- Verify IndexedDB is enabled in browser

**Need to see new changes or reset the app?**
- Click the **settings gear (⚙)** in the top-right corner
- Scroll down to "Clear All Data" section
- Click **"Clear Cache & Data"** button
- This will:
  - Delete all tasks from local storage
  - Clear the sync queue
  - Remove API token and all settings
  - Delete service worker cache
  - Unregister the service worker
  - Reload the page with a fresh state

## Color Scheme

The app uses a calming sage green color palette:
- **Primary:** #85a584 (Sage green)
- **Primary Dark:** #6a8a69 (Dark sage)
- **Background:** #ffffff (White)
- **Text:** #1a1a1a (Near black)

## License

MIT
