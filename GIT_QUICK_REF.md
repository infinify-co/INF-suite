# Git Workflow Quick Reference

## 🚀 Common Commands

### Start New Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/feature-name
```

### Commit & Push Feature
```bash
git add .
git commit -m "feat: description"
git push -u origin feature/feature-name
# Then create PR on GitHub: feature/* → develop
```

### Sync with Develop
```bash
git checkout feature/my-feature
git fetch origin
git merge origin/develop
```

### Release to Production
```bash
# Create PR on GitHub: develop → main
# After merge:
git checkout main
git pull origin main
```

### Hotfix Production
```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-name
# Make fix, commit, push, create PR to main
# After merge, also merge to develop
```

## 📋 Branch Rules
- `main` = Production (protected)
- `develop` = Staging/Testing
- `feature/*` = New features
- `bugfix/*` = Bug fixes
- `hotfix/*` = Urgent production fixes

## 🔄 Typical Workflow
1. Create feature branch from `develop`
2. Make changes and commit
3. Push and create PR to `develop`
4. After testing, create PR from `develop` to `main`
5. Merge to `main` = Production release

