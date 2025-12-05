# Kreative PWA Setup Guide

## Quick Start

### 1. Generate Icons

To generate the required PWA icons, open `icon-generator.html` in your browser:

```bash
# Open in your default browser
open icon-generator.html
# or
python3 -m http.server 8080
# Then visit: http://localhost:8080/icon-generator.html
```

The icon generator will:
- Create all required icon sizes (72, 96, 128, 144, 152, 192, 384, 512)
- Display previews of each icon
- Allow you to download each icon individually

**Save all icons to the `icons/` folder with the names shown (e.g., `icon-72.png`, `icon-192.png`, etc.)**

### 2. Start the Development Server

Since PWAs require HTTPS (or localhost), you need to serve the files through a web server:

**Using Python:**
```bash
python3 -m http.server 8080
```

**Using Node.js:**
```bash
npx http-server -p 8080
```

**Using PHP:**
```bash
php -S localhost:8080
```

### 3. Open the App

Visit `http://localhost:8080/` or `http://localhost:8080/dashboard.html`

### 4. Install as PWA

1. Look for the install prompt in your browser's address bar
2. Click the install icon (usually a + or ⬇️ symbol)
3. Follow the prompts to install

**Chrome/Edge:**
- Click the install icon in the address bar
- Or use Menu > Install Kreative Dashboard

**Safari (iOS/macOS):**
- Tap the Share button
- Select "Add to Home Screen"

**Firefox:**
- Click the address bar icon
- Select "Install"

## Features

### PWA Capabilities

✅ **Offline Support** - Works without internet connection  
✅ **Install as App** - Add to home screen/desktop  
✅ **Push Notifications** - Stay updated (requires setup)  
✅ **Background Sync** - Syncs when connection restored  
✅ **Responsive Design** - Works on all devices  
✅ **Fast Loading** - Cached assets for quick access

### Pages

- `dashboard.html` - Main dashboard (home page)
- `projects.html` - Project management and files
- `index.html` - Redirects to dashboard

### Key Files

- `manifest.json` - PWA configuration
- `sw.js` - Service worker for offline functionality
- `kreative-styles.css` - All styling
- `kreative-app.js` - Application logic
- `icons/` - PWA icons (various sizes)

## Development

### File Structure

```
kreative/
├── dashboard.html          # Main dashboard page
├── projects.html           # Projects/files page
├── index.html             # Entry point (redirects)
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── kreative-styles.css    # Styles
├── kreative-app.js        # JavaScript
├── package.json           # Project config
├── icon-generator.html    # Icon generation tool
├── generate-icons.js      # Icon generation script
├── icons/                 # PWA icons
│   ├── icon.svg          # Source SVG
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── screenshots/           # PWA screenshots
└── README.md             # Documentation
```

### Testing PWA Features

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check sections:
   - Manifest - View PWA settings
   - Service Workers - Check registration
   - Cache Storage - View cached files
   - Clear Storage - Reset PWA state

**Test Offline:**
1. Open DevTools > Network tab
2. Select "Offline" from throttling dropdown
3. Refresh the page - should still work

**Test Install:**
1. Open in Chrome/Edge
2. Look for install prompt
3. Check Desktop/Home Screen after install

## Customization

### Change Colors

Edit `kreative-styles.css`:

```css
:root {
    --primary-bg: #f5f5f5;        /* Main background */
    --secondary-bg: #ffffff;       /* Card background */
    --text-primary: #2c2c2c;       /* Main text */
    --text-secondary: #6e6e6e;     /* Secondary text */
    --border-color: #e0e0e0;       /* Borders */
    --accent-blue: #0d66d0;        /* Primary accent */
    --accent-purple: #7b61ff;      /* Secondary accent */
}
```

### Change App Name

Edit `manifest.json`:

```json
{
  "name": "Your App Name",
  "short_name": "YourApp",
  ...
}
```

Also update:
- Page titles in HTML files
- Logo text in navigation

### Add New Pages

1. Create new HTML file
2. Copy structure from `dashboard.html` or `projects.html`
3. Update navigation links
4. Add to service worker cache in `sw.js`

### Modify Icons

1. Edit `icons/icon.svg`
2. Run `icon-generator.html` to regenerate PNGs
3. Clear cache and reinstall PWA

## Deployment

### Deploy to Netlify

1. Push to GitHub
2. Connect repository to Netlify
3. Set build settings:
   - Build command: (none)
   - Publish directory: `kreative`
4. Deploy

### Deploy to Vercel

```bash
npm install -g vercel
cd kreative
vercel
```

### Deploy to GitHub Pages

1. Push to GitHub repository
2. Go to Settings > Pages
3. Select branch and `/kreative` folder
4. Save

**Note:** PWAs require HTTPS in production. All major hosting platforms provide this automatically.

## Troubleshooting

### Service Worker Not Registering

- Ensure you're using HTTPS or localhost
- Check browser console for errors
- Clear cache and hard refresh (Cmd/Ctrl + Shift + R)

### Icons Not Showing

- Verify all icon files exist in `icons/` folder
- Check file names match `manifest.json`
- Clear cache and reinstall PWA

### Offline Mode Not Working

- Check service worker registration in DevTools
- Verify cache storage contains files
- Try unregistering and re-registering service worker

### Install Prompt Not Showing

- PWA criteria must be met:
  - Valid manifest.json
  - Service worker registered
  - Served over HTTPS (or localhost)
  - Icons present
- Some browsers (Safari) don't show automatic prompts

## Browser Support

| Browser | Install | Offline | Notifications |
|---------|---------|---------|---------------|
| Chrome  | ✅      | ✅      | ✅            |
| Edge    | ✅      | ✅      | ✅            |
| Firefox | ✅      | ✅      | ✅            |
| Safari  | ⚠️      | ✅      | ❌            |
| Opera   | ✅      | ✅      | ✅            |

⚠️ = Partial support (manual Add to Home Screen)

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://maskable.app/)

## Support

For issues or questions about this Kreative PWA setup, check:
- Browser console for error messages
- DevTools > Application tab for PWA status
- `README.md` for feature documentation

