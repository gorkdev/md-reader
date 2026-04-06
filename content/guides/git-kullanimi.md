<!-- title: Git Usage Guide -->
<!-- date: 2026-04-02 -->
<!-- category: guides -->

# Git Usage Guide

Git is a version control system and plays an important role in software development. This guide explains basic Git commands and workflow.

## What is Git?

Git is a distributed version control system that tracks changes in your files. It is a fundamental tool in team collaboration and project management.

## Initial Setup

```bash
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

## Basic Commands

### Creating a Repository

```bash
git init
```

### Adding Changes to Staging Area

```bash
git add .
```

### Creating a Commit

```bash
git commit -m "A meaningful commit message"
```

### Pushing Changes to Remote Server

```bash
git push origin main
```

### Pulling Changes from Remote Repository

```bash
git pull origin main
```

## Branch Workflow

```bash
# Creating a new branch
git branch feature/new-feature

# Switching to a branch
git checkout feature/new-feature

# Deleting a branch
git branch -d feature/new-feature
```

## Best Practices

- Write commit messages clearly and understandably
- Commit in small, logical chunks
- Do not modify the main branch directly
- Use pull requests to go through code review

This guide covers the basics of Git usage.
