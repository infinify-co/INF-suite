# Git Branching Strategy

This document outlines the Git workflow and branching strategy for the INF Site project.

## 🌳 Branch Structure

```
main (production)
├── develop (staging/testing)
├── feature/feature-name (new features)
├── bugfix/bug-name (bug fixes)
└── hotfix/fix-name (urgent production fixes)
```

## 📋 Branch Types

### `main` (Production)
- **Purpose**: Production-ready code
- **Protection**: Should be protected, requires PR approval
- **Deployment**: Auto-deploys to production (Netlify)
- **Merges from**: `develop` (via PR) or `hotfix/*` (direct merge)

### `develop` (Staging)
- **Purpose**: Integration branch for testing
- **Deployment**: Auto-deploys to staging environment
- **Merges from**: `feature/*`, `bugfix/*`
- **Merges to**: `main` (via PR for releases)

### `feature/*` (Feature Branches)
- **Purpose**: New features or enhancements
- **Naming**: `feature/feature-name` (e.g., `feature/user-dashboard`)
- **Created from**: `develop`
- **Merges to**: `develop` (via PR)
- **Lifecycle**: Delete after merge

### `bugfix/*` (Bug Fix Branches)
- **Purpose**: Fixing bugs found in `develop`
- **Naming**: `bugfix/bug-description` (e.g., `bugfix/login-error`)
- **Created from**: `develop`
- **Merges to**: `develop` (via PR)

### `hotfix/*` (Hotfix Branches)
- **Purpose**: Urgent fixes for production
- **Naming**: `hotfix/fix-description` (e.g., `hotfix/security-patch`)
- **Created from**: `main`
- **Merges to**: Both `main` AND `develop`
- **Use case**: Critical production issues that can't wait for normal release

## 🔄 Workflow Process

### Starting a New Feature

```bash
# 1. Ensure you're on develop and it's up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-new-feature

# 3. Make changes and commit
git add .
git commit -m "Add feature: description"

# 4. Push branch
git push -u origin feature/my-new-feature

# 5. Create Pull Request on GitHub to merge into develop
```

### Completing a Feature

```bash
# 1. Ensure all changes are committed
git add .
git commit -m "Complete feature: description"

# 2. Push to remote
git push origin feature/my-new-feature

# 3. Create PR on GitHub: feature/* → develop
# 4. After PR is merged, delete local branch
git checkout develop
git pull origin develop
git branch -d feature/my-new-feature
```

### Releasing to Production

```bash
# 1. Ensure develop is stable and tested
git checkout develop
git pull origin develop

# 2. Create release PR: develop → main
# 3. After PR approval and merge:
git checkout main
git pull origin main

# 4. Tag the release (optional)
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Hotfix Process

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Make fix and commit
git add .
git commit -m "Hotfix: fix critical issue"

# 3. Push and create PR to main
git push -u origin hotfix/critical-fix

# 4. After merging to main, also merge to develop
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```
Format: <type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code refactoring
- test: Adding or updating tests
- chore: Maintenance tasks

Examples:
- feat: Add user authentication system
- fix: Resolve login redirect issue
- docs: Update deployment guide
- style: Format code with prettier
```

## 🚫 Branch Protection Rules

### Recommended GitHub Settings:

1. **main branch**:
   - Require pull request reviews (1 approval)
   - Require status checks to pass
   - Require branches to be up to date
   - Do not allow force pushes
   - Do not allow deletions

2. **develop branch**:
   - Require pull request reviews (optional)
   - Do not allow force pushes

## 🔍 Branch Naming Conventions

- **Features**: `feature/description` (kebab-case)
  - ✅ `feature/user-dashboard`
  - ✅ `feature/add-payment-gateway`
  - ❌ `feature/userDashboard`
  - ❌ `feature/user_dashboard`

- **Bugfixes**: `bugfix/description`
  - ✅ `bugfix/login-error`
  - ✅ `bugfix/mobile-menu-overlap`

- **Hotfixes**: `hotfix/description`
  - ✅ `hotfix/security-patch`
  - ✅ `hotfix/critical-api-fix`

## 🧹 Branch Cleanup

Regularly clean up merged branches:

```bash
# Delete local branches that have been merged
git branch --merged develop | grep -v "\*\|develop\|main" | xargs -n 1 git branch -d

# Delete remote branches that have been merged (be careful!)
git remote prune origin
```

## 📊 Visual Workflow

```
Feature Development:
develop → feature/new-feature → [PR] → develop → [PR] → main

Bug Fix:
develop → bugfix/fix-bug → [PR] → develop → [PR] → main

Hotfix:
main → hotfix/critical → [PR] → main → merge → develop
```

## 🆘 Common Scenarios

### Syncing Feature Branch with Latest Develop

```bash
git checkout feature/my-feature
git fetch origin
git merge origin/develop
# Resolve conflicts if any
git push origin feature/my-feature
```

### Undoing Last Commit (Before Push)

```bash
git reset --soft HEAD~1  # Keep changes
# or
git reset --hard HEAD~1  # Discard changes
```

### Stashing Changes

```bash
git stash  # Save changes temporarily
git checkout other-branch
# Do work
git checkout feature/my-feature
git stash pop  # Restore changes
```

## 📚 Additional Resources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)

