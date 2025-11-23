#!/bin/bash

# Git Workflow Helper Scripts
# Usage: source scripts/git-helpers.sh (or add to your .zshrc/.bashrc)

# Start a new feature
git-feature() {
    if [ -z "$1" ]; then
        echo "Usage: git-feature <feature-name>"
        return 1
    fi
    
    git checkout develop
    git pull origin develop
    git checkout -b "feature/$1"
    echo "✅ Created and switched to feature/$1"
}

# Start a new bugfix
git-bugfix() {
    if [ -z "$1" ]; then
        echo "Usage: git-bugfix <bug-name>"
        return 1
    fi
    
    git checkout develop
    git pull origin develop
    git checkout -b "bugfix/$1"
    echo "✅ Created and switched to bugfix/$1"
}

# Start a new hotfix
git-hotfix() {
    if [ -z "$1" ]; then
        echo "Usage: git-hotfix <fix-name>"
        return 1
    fi
    
    git checkout main
    git pull origin main
    git checkout -b "hotfix/$1"
    echo "✅ Created and switched to hotfix/$1"
}

# Finish a feature (merge to develop)
git-finish-feature() {
    local branch=$(git branch --show-current)
    
    if [[ ! $branch == feature/* ]]; then
        echo "❌ Not on a feature branch"
        return 1
    fi
    
    git add .
    git status
    echo "📝 Ready to commit? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Enter commit message:"
        read -r message
        git commit -m "$message"
        git push -u origin "$branch"
        echo "✅ Pushed $branch. Create PR to merge into develop."
    fi
}

# Sync current branch with develop
git-sync() {
    local branch=$(git branch --show-current)
    echo "🔄 Syncing $branch with develop..."
    git fetch origin
    git merge origin/develop
    echo "✅ Synced with develop"
}

# Clean up merged branches
git-cleanup() {
    echo "🧹 Cleaning up merged branches..."
    git checkout develop
    git pull origin develop
    git branch --merged develop | grep -v "\*\|develop\|main" | xargs -n 1 git branch -d
    echo "✅ Cleaned up local branches"
}

# Show branch status
git-status-all() {
    echo "📊 Branch Status:"
    echo ""
    echo "Current branch: $(git branch --show-current)"
    echo ""
    echo "Local branches:"
    git branch
    echo ""
    echo "Remote branches:"
    git branch -r
    echo ""
    echo "Uncommitted changes:"
    git status -s
}



