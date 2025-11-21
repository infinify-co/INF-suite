# Potential Issues & Troubleshooting Guide

This document outlines common issues you may encounter when using the Git branching workflow and how to resolve them.

## 🔴 Critical Issues

### Issue: Accidentally Committed to Main Branch

**Problem**: You made changes directly on `main` instead of a feature branch.

**Solution**:
```bash
# 1. Create a new branch from current state (saves your work)
git checkout -b feature/my-changes

# 2. Switch back to main
git checkout main

# 3. Reset main to match remote (removes local commits)
git reset --hard origin/main

# 4. Continue working on your feature branch
git checkout feature/my-changes
```

**Prevention**: Always check your current branch before making changes:
```bash
git branch --show-current
```

---

### Issue: Merge Conflicts During PR

**Problem**: Your feature branch has conflicts with `develop` or `main`.

**Solution**:
```bash
# 1. Sync your branch with the target branch
git checkout feature/my-feature
git fetch origin
git merge origin/develop  # or origin/main

# 2. Git will show conflict markers in files
# Look for: <<<<<<< HEAD, =======, >>>>>>>

# 3. Edit files to resolve conflicts
# Remove conflict markers and keep the correct code

# 4. Stage resolved files
git add .

# 5. Complete the merge
git commit -m "Merge develop into feature/my-feature"

# 6. Push the resolved branch
git push origin feature/my-feature
```

**Prevention**: Regularly sync your feature branch with develop:
```bash
git checkout feature/my-feature
git fetch origin
git merge origin/develop
```

---

### Issue: Lost Uncommitted Changes

**Problem**: You switched branches and lost uncommitted work.

**Solution**:
```bash
# Check if Git stashed your changes
git stash list

# If you see stashes, restore them
git stash pop

# If no stash, check reflog for lost commits
git reflog
# Find the commit hash and restore
git checkout <commit-hash>
```

**Prevention**: Always commit or stash before switching branches:
```bash
git stash  # Saves changes temporarily
# or
git commit -m "WIP: work in progress"
```

---

## 🟡 Common Issues

### Issue: Branch is Behind Remote

**Problem**: `git push` fails with "branch is behind" error.

**Solution**:
```bash
# Pull latest changes first
git pull origin develop  # or main

# Resolve any conflicts, then push
git push origin feature/my-feature
```

**Alternative** (if you're sure your changes are correct):
```bash
# Force push (USE WITH CAUTION - only on feature branches!)
git push --force-with-lease origin feature/my-feature
```

**⚠️ Warning**: Never force push to `main` or `develop`!

---

### Issue: Accidentally Deleted a Branch

**Problem**: You deleted a branch that had unmerged work.

**Solution**:
```bash
# 1. Find the branch in reflog
git reflog

# 2. Find the commit hash where the branch existed
# 3. Recreate the branch from that commit
git checkout -b feature/my-feature <commit-hash>
```

**Prevention**: Don't delete branches until PR is merged and you've verified the merge.

---

### Issue: Wrong Branch Name Convention

**Problem**: Created branch with wrong naming (e.g., `feature_my_feature` instead of `feature/my-feature`).

**Solution**:
```bash
# Rename the branch
git branch -m feature_my_feature feature/my-feature

# If already pushed, update remote
git push origin -u feature/my-feature
git push origin --delete feature_my_feature
```

---

### Issue: Committed to Wrong Branch

**Problem**: Made commits on `develop` that should be on a feature branch.

**Solution**:
```bash
# 1. Create feature branch from current state
git checkout -b feature/my-feature

# 2. Switch back to develop
git checkout develop

# 3. Remove the commits from develop (keep changes)
git reset --soft HEAD~n  # n = number of commits to remove

# 4. Or remove commits completely
git reset --hard origin/develop
```

---

### Issue: Large File Committed to Git

**Problem**: Accidentally committed a large file (video, image, etc.) causing repo bloat.

**Solution**:
```bash
# 1. Remove file from Git (keep local copy)
git rm --cached large-file.mp4

# 2. Add to .gitignore
echo "large-file.mp4" >> .gitignore

# 3. Commit the removal
git commit -m "Remove large file"

# 4. If already pushed, clean Git history (advanced)
# Consider using git-filter-repo or BFG Repo-Cleaner
```

**Prevention**: Review files before committing:
```bash
git status
git diff --cached  # See what will be committed
```

---

## 🟢 Workflow Issues

### Issue: Feature Branch is Too Old

**Problem**: Your feature branch is many commits behind `develop`.

**Solution**:
```bash
# 1. Sync with develop
git checkout feature/my-feature
git fetch origin
git merge origin/develop

# 2. Resolve conflicts if any
# 3. Test thoroughly after merge
# 4. Push updated branch
git push origin feature/my-feature
```

**Prevention**: Keep feature branches short-lived and regularly sync with develop.

---

### Issue: Multiple Features in One Branch

**Problem**: You've been working on multiple features in the same branch.

**Solution**:
```bash
# 1. Create separate branches for each feature
git checkout feature/mixed-features
git checkout -b feature/feature-one
# Make commits for feature one
git push -u origin feature/feature-one

# 2. Go back and create another branch
git checkout feature/mixed-features
git checkout -b feature/feature-two
# Make commits for feature two
git push -u origin feature/feature-two
```

**Prevention**: One feature per branch. Create new branch for each feature.

---

### Issue: Hotfix Needs to Go to Both Main and Develop

**Problem**: After hotfixing `main`, `develop` doesn't have the fix.

**Solution**:
```bash
# 1. After merging hotfix to main
git checkout develop
git pull origin develop

# 2. Merge main into develop
git merge main

# 3. Resolve conflicts if any
# 4. Push to develop
git push origin develop
```

**Prevention**: Always merge hotfixes to both `main` and `develop`.

---

## 🔵 Deployment Issues

### Issue: Changes Not Reflecting After Deployment

**Problem**: You merged to `main` but site hasn't updated.

**Possible Causes & Solutions**:

1. **Netlify not connected to GitHub**
   - Go to Netlify dashboard → Site settings → Build & deploy
   - Connect to GitHub repository
   - Set branch to `main`

2. **Build failed**
   - Check Netlify deploy logs
   - Fix any build errors
   - Redeploy

3. **Cache issues**
   - Clear browser cache
   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
   - Check Netlify cache settings

4. **Wrong branch deployed**
   - Verify Netlify is deploying from `main`
   - Check branch settings in Netlify

---

### Issue: Staging Environment Not Updating

**Problem**: `develop` branch changes not showing on staging.

**Solution**:
1. Verify Netlify branch deploy is set up for `develop`
2. Check if PR previews are enabled
3. Manually trigger deploy in Netlify dashboard
4. Verify branch protection isn't blocking deployment

---

## 🟣 Git Configuration Issues

### Issue: Git Credentials Not Working

**Problem**: `git push` asks for credentials every time.

**Solution**:
```bash
# Set up credential helper (macOS)
git config --global credential.helper osxkeychain

# Or use SSH keys instead
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add to GitHub: Settings → SSH and GPG keys
```

---

### Issue: Wrong Git User/Email

**Problem**: Commits showing wrong author.

**Solution**:
```bash
# Set global user
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Or set per-repository
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## 🟠 Collaboration Issues

### Issue: Someone Else Pushed to Your Branch

**Problem**: Collaborator pushed changes to your feature branch.

**Solution**:
```bash
# Pull their changes
git pull origin feature/my-feature

# Review changes
git log

# If conflicts, resolve them
git merge origin/feature/my-feature
```

**Prevention**: Communicate with team about who's working on which branch.

---

### Issue: PR Shows Unwanted Commits

**Problem**: Your PR includes commits from other features.

**Solution**:
```bash
# Interactive rebase to clean up commits
git checkout feature/my-feature
git rebase -i develop

# In the editor, mark unwanted commits as 'drop'
# Save and close

# Force push (safe on feature branches)
git push --force-with-lease origin feature/my-feature
```

---

## 🛠️ Prevention Best Practices

1. **Always check current branch**: `git branch --show-current`
2. **Pull before starting work**: `git pull origin develop`
3. **Commit frequently**: Small, logical commits
4. **Test before pushing**: Run `npm run dev` and test locally
5. **Review before committing**: `git status` and `git diff`
6. **Keep branches short-lived**: Merge within days, not weeks
7. **One feature per branch**: Don't mix multiple features
8. **Sync regularly**: Merge `develop` into your feature branch often
9. **Use descriptive commit messages**: Follow conventional commits
10. **Protect main branch**: Enable branch protection on GitHub

## 📞 Getting Help

If you encounter an issue not covered here:

1. Check Git status: `git status`
2. Check Git log: `git log --oneline --graph --all`
3. Review error messages carefully
4. Search Git documentation: `git help <command>`
5. Check GitHub/GitLab documentation
6. Ask team members for help

## 🚨 Emergency Procedures

### Complete Reset to Remote State

**⚠️ WARNING: This discards all local changes!**

```bash
# Reset to match remote exactly
git fetch origin
git reset --hard origin/main  # or develop
git clean -fd  # Remove untracked files
```

### Recover Lost Work

```bash
# Check reflog for lost commits
git reflog

# Recover specific commit
git checkout -b recovery-branch <commit-hash>
```

### Undo Last Commit (Before Push)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes, undo commit
git reset --hard HEAD~1
```

---

**Remember**: When in doubt, create a backup branch before making destructive operations:
```bash
git branch backup-branch-name
```

