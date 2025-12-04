# Wavecode - Lovable Clone PWA

A standalone Progressive Web App (PWA) for creating and managing projects, inspired by Lovable.

## Features

- ✅ Progressive Web App (PWA) with offline support
- ✅ Modern UI with gradient background
- ✅ Sidebar navigation
- ✅ Project creation and management
- ✅ Recently viewed projects
- ✅ Responsive design

## Files Structure

- `index.html` - Main application HTML
- `styles.css` - All styling including gradient background
- `app.js` - Application logic and project management
- `manifest.json` - PWA manifest file
- `sw.js` - Service worker for offline functionality

## PWA Requirements

### Icons Needed

For the PWA to work fully, you need to create two icon files:

1. `icon-192.png` - 192x192 pixels
2. `icon-512.png` - 512x512 pixels

You can generate these from any image editing tool or online icon generator. The icons should represent the Wavecode brand.

### HTTPS Requirement

PWAs require HTTPS to function properly. Make sure your site is served over HTTPS:
- Local development: Use `localhost` (HTTPS not required for localhost)
- Production: Deploy to a hosting service that provides HTTPS (Netlify, Vercel, GitHub Pages with custom domain, etc.)

## Usage

1. Open `index.html` in a web browser
2. The service worker will automatically register
3. Create projects using the input field or the "+" button
4. View recently viewed projects or all projects using the tabs

## Browser Support

- Chrome/Edge (full PWA support)
- Firefox (full PWA support)
- Safari (iOS 11.3+, macOS 11.1+)

## Development

The app uses localStorage for project storage. In a production environment, you would typically connect this to a backend API.

## Customization

- Colors: Edit CSS variables in `styles.css` (`:root` section)
- Project types: Modify the select options in `index.html`
- Navigation: Add new pages in the sidebar navigation

