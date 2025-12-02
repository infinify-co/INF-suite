# Netlify Deployment Guide

## 🚀 How to Deploy a New Version to Netlify

You have **three options** to deploy updates to your Netlify site:

---

## Option 1: Automatic Deployment (Recommended) ⚡

**If your GitHub repository is connected to Netlify**, deployments happen automatically when you push to your connected branch.

### Steps:
1. **Make your changes** to the code
2. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Your update message"
   ```
3. **Push to GitHub:**
   ```bash
   git push origin main
   ```
4. **Netlify automatically deploys** - Check your Netlify dashboard to see the deployment progress

### To Set Up Automatic Deployment (First Time):
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub account
4. Select your repository: `infinify-co/INF-suite`
5. Netlify will detect your `netlify.toml` settings automatically
6. Click "Deploy site"

---

## Option 2: Netlify CLI (Command Line) 💻

Deploy directly from your terminal using the Netlify CLI.

### First Time Setup:
1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```
   (This will open your browser to authenticate)

3. **Link your site** (if not already linked):
   ```bash
   netlify link
   ```
   Follow the prompts to connect to your existing Netlify site.

### Deploy Commands:

**Deploy to Production (Live Site):**
```bash
npm run deploy:netlify
```
or
```bash
netlify deploy --prod
```

**Deploy as Draft (Preview):**
```bash
npm run deploy:netlify:draft
```
or
```bash
netlify deploy
```

**Deploy with a specific directory:**
```bash
netlify deploy --prod --dir=.
```

---

## Option 3: Manual Drag & Drop 📦

For quick one-off deployments without Git:

1. **Go to Netlify Dashboard:**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Select your site

2. **Go to Deploys tab:**
   - Click on "Deploys" in the top navigation

3. **Drag & Drop:**
   - Drag your entire project folder (or a zip file) onto the deploy area
   - Netlify will deploy it immediately

**Note:** This method doesn't preserve deployment history like Git-based deployments.

---

## 📋 Current Netlify Configuration

Your `netlify.toml` is configured with:
- **Publish directory:** `.` (root directory)
- **Functions directory:** `netlify/functions`
- **CORS headers** for API functions

---

## 🔍 Check Deployment Status

### Via Netlify Dashboard:
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click on your site
3. View the "Deploys" tab to see:
   - Current live deployment
   - Deployment history
   - Build logs
   - Preview URLs

### Via CLI:
```bash
netlify status
```

---

## 🐛 Troubleshooting

### Deployment Fails:
1. **Check build logs** in Netlify dashboard
2. **Verify file paths** - make sure all files are committed
3. **Check `netlify.toml`** configuration
4. **Ensure dependencies** are in `package.json` if needed

### Site Not Updating:
1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check deployment status** - make sure deployment completed
3. **Verify you're looking at the right site** URL

### CLI Not Working:
1. **Re-authenticate:** `netlify logout` then `netlify login`
2. **Re-link site:** `netlify unlink` then `netlify link`
3. **Update CLI:** `npm install -g netlify-cli@latest`

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Deploy to production | `npm run deploy:netlify` |
| Deploy as draft | `npm run deploy:netlify:draft` |
| Check status | `netlify status` |
| View logs | `netlify logs` |
| Open site | `netlify open` |
| Open admin | `netlify open:admin` |

---

## 📝 Best Practices

1. **Use Git-based deployments** for version control and history
2. **Test locally** before deploying (`npm start` or `npm run serve`)
3. **Use draft deployments** to preview changes before going live
4. **Check deployment logs** if something goes wrong
5. **Set up branch deploys** for feature branches (in Netlify settings)

---

**Need Help?** Check the [Netlify Documentation](https://docs.netlify.com/) or your Netlify dashboard for more details.

