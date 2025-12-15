# 🔄 Force Lovable Rebuild - Quick Fix Guide

## The Problem

Changes are committed and pushed, but they're not showing up on Lovable.

## The Solution: Force a Rebuild

### Step 1: Commit and Push Your Changes

```bash
git add .
git commit -m "Update build configuration with commit hash"
git push
```

### Step 2: Force Rebuild in Lovable Dashboard

**Option A: Via Dashboard (Recommended)**

1. Go to your Lovable project: https://lovable.dev
2. Navigate to your project dashboard
3. Click the **"Deploy"** or **"Rebuild"** button
4. Wait for the build to complete (2-3 minutes)
5. Check the build logs to ensure it completed successfully

**Option B: Via Settings**

1. Go to your Lovable project settings
2. Navigate to **Deployment** or **Build Settings**
3. Look for **"Trigger Build"** or **"Rebuild Now"** button
4. Click it and wait for completion

### Step 3: Clear Browser Cache

After the rebuild completes:

- **Chrome/Edge**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: Press `Cmd+Option+R`

Or clear cache manually:

- **Chrome**: Settings → Privacy → Clear browsing data → Cached images and files
- **Firefox**: Settings → Privacy → Clear Data → Cached Web Content
- **Safari**: Develop → Empty Caches (enable Develop menu first)

### Step 4: Verify the Build Updated

1. Visit your deployed site
2. Scroll to the footer
3. Check the build timestamp and commit hash
4. The timestamp should be recent (within the last few minutes)
5. The commit hash should match your latest commit (`git log -1 --oneline`)

## Why This Happens

Lovable may not automatically rebuild on every commit. This can happen because:

- Build caching is enabled
- Auto-deploy is disabled in settings
- Build queue is processing other projects
- Build failed silently

## Prevention: Enable Auto-Deploy

1. Go to Lovable project settings
2. Find **"Auto Deploy"** or **"Deploy on Push"** setting
3. Enable it if it's disabled
4. This will automatically rebuild on every push to your main branch

## Troubleshooting

### Build Still Not Updating?

1. **Check Build Logs**
   - Go to Lovable → Deployment → Build Logs
   - Look for errors or warnings
   - Ensure `npm run build` completed successfully

2. **Verify Git Push**

   ```bash
   git log --oneline -1
   git remote -v  # Verify remote URL
   ```

3. **Check Build Configuration**
   - Ensure `package.json` has `"build": "vite build"`
   - Verify `vite.config.ts` exists and is valid
   - Check that all dependencies are installed

4. **Test Build Locally**
   ```bash
   npm run build
   ```
   If this fails, fix the errors before pushing to Lovable.

### Still Not Working?

1. Contact Lovable support with:
   - Your project URL
   - Build log output
   - Git commit hash
   - Screenshot of the footer showing old timestamp

2. Alternative: Try deploying to a different branch first to test

## Quick Checklist

- [ ] Changes committed and pushed to git
- [ ] Force rebuild triggered in Lovable
- [ ] Build completed successfully (check logs)
- [ ] Browser cache cleared
- [ ] Hard refresh performed (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Footer shows new timestamp and commit hash

---

**Last Updated**: This guide is for the current build configuration with commit hash tracking.
