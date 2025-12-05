# Kreative Dashboard PWA

A Progressive Web App for creative project management and design tools, inspired by Adobe Creative Cloud.

## Features

- **PWA Support**: Install as a standalone app on any device
- **Offline Functionality**: Works without internet connection
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface inspired by Adobe Creative Cloud
- **Push Notifications**: Stay updated with project changes
- **Background Sync**: Automatic syncing when connection is restored

## Installation

### For Users

1. Open `dashboard.html` in a modern web browser
2. Look for the "Install" prompt in your browser
3. Click "Install" to add the app to your device

### For Developers

1. Ensure all files are in the same directory:
   - `dashboard.html`
   - `kreative-styles.css`
   - `kreative-app.js`
   - `manifest.json`
   - `sw.js`

2. Create an `icons` folder and add PWA icons:
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

3. Serve the files using a web server (required for PWA features):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```

4. Visit `http://localhost:8000/dashboard.html`

## PWA Features

### Service Worker
The app uses a service worker (`sw.js`) to:
- Cache assets for offline use
- Implement network-first strategy with cache fallback
- Handle background sync
- Manage push notifications

### Manifest
The `manifest.json` file defines:
- App name and description
- Display mode (standalone)
- Icons for different sizes
- Theme colors
- Shortcuts
- Share target

### Offline Support
- All core assets are cached on first visit
- Network-first strategy ensures fresh content when online
- Graceful fallback to cached content when offline

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial support (iOS 11.3+)
- Opera: Full support

## Customization

### Colors
Edit CSS variables in `kreative-styles.css`:
```css
:root {
    --primary-bg: #f5f5f5;
    --accent-blue: #0d66d0;
    --accent-purple: #7b61ff;
}
```

### Icons
Replace icon files in the `icons/` folder with your own branding.

### Content
Edit `dashboard.html` to customize sections, cards, and features.

## Development

### Testing PWA Features

1. Use Chrome DevTools > Application tab
2. Check Service Worker status
3. Test offline mode using Network throttling
4. Verify manifest settings

### Debugging

- Service Worker: Chrome DevTools > Application > Service Workers
- Cache: Chrome DevTools > Application > Cache Storage
- Manifest: Chrome DevTools > Application > Manifest

## Performance

- Optimized for fast loading
- Lazy loading of images
- Efficient caching strategy
- Minimal dependencies

## Security

- HTTPS required for PWA features in production
- Service worker only works on secure origins
- Content Security Policy recommended

## License

© 2025 Kreative. All rights reserved.

## Support

For issues or questions, please contact support.

