# Quick Deployment Guide

## 🚀 Deploy to Vercel (5 minutes)

### Step 1: Prepare Your Code
```bash
# Make sure all files are in a git repository
git init
git add .
git commit -m "Initial commit"

# Push to GitHub (create a repo on github.com first)
git remote add origin https://github.com/yourusername/recipe-parser.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your recipe-parser repository
4. Vercel will auto-detect it's a Vite project
5. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click "Deploy"

**Done!** Your app will be live in ~2 minutes at `your-app.vercel.app`

---

## 🌐 Deploy to Netlify (5 minutes)

### Step 1: Prepare Your Code
```bash
# Same as above - push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/recipe-parser.git
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Go to https://netlify.com and sign in
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (click "Show advanced"):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy site"

**Done!** Your app will be live at `your-app.netlify.app`

---

## ⚡ One-Click Deployment

### Vercel Deploy Button
Add this to your GitHub README for one-click deployments:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/recipe-parser)

### Netlify Deploy Button
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/recipe-parser)

---

## 🔒 Security Checklist

Before deploying, make sure:
- ✅ `.env` is in `.gitignore` (it is by default)
- ✅ Never commit your `.env` file to GitHub
- ✅ Environment variables are set in Vercel/Netlify dashboard
- ✅ Supabase Row Level Security is enabled (it is via the SQL script)

---

## 🔧 Custom Domain Setup

### Vercel
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update your DNS records as instructed

### Netlify
1. Go to "Domain settings"
2. Click "Add custom domain"
3. Follow DNS configuration steps

---

## 📊 Monitoring

### Vercel
- Analytics: Built-in, automatically enabled
- Logs: View in the "Deployments" tab

### Netlify
- Analytics: Enable in site settings
- Logs: View in "Deploy logs"

---

## 🐛 Troubleshooting Deployment

### Build Fails
- Check Node version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### App Loads But Doesn't Work
- Verify environment variables are set correctly
- Check browser console for errors
- Make sure Supabase URL doesn't have trailing slash

### Authentication Issues
- Verify Supabase URL is correct in env vars
- Check that email provider is enabled in Supabase
- Add your deployment URL to Supabase allowed URLs:
  - Go to Authentication → URL Configuration
  - Add your Vercel/Netlify URL to "Site URL"

---

## 🎯 Next Steps After Deployment

1. Test the live app thoroughly
2. Share the URL with friends
3. Set up a custom domain (optional)
4. Monitor usage in Supabase dashboard
5. Consider upgrading Supabase plan if you get lots of users

---

## 💡 Pro Tips

- Use `main` branch for production
- Create a `dev` branch for testing
- Set up preview deployments (automatic with Vercel/Netlify)
- Enable HTTPS (automatic with both platforms)
- Set up analytics to track usage
