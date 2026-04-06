# MD Reader - Initial Setup & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a React app that reads local .md files from 4 project folders, displays them in a beautiful table with filtering, behind a login page.

**Architecture:** Vite + React 19 + Tailwind CSS v4 + shadcn/ui. Auth via localStorage (hardcoded credentials). MD files imported at build-time via Vite's `import.meta.glob`. React Router for navigation with protected routes.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, shadcn/ui, react-router-dom, react-icons

---

### Task 1: Install Dependencies & Configure Tailwind CSS v4

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Install Tailwind CSS v4 with Vite plugin**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Install react-router-dom and react-icons**

```bash
npm install react-router-dom react-icons
```

- [ ] **Step 3: Update vite.config.js to add Tailwind and path alias**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Replace src/index.css with Tailwind import**

```css
@import "tailwindcss";
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

---

### Task 2: Set Up shadcn/ui

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.js`
- Modify: `src/index.css` (add CSS variables)

- [ ] **Step 1: Install shadcn dependencies**

```bash
npx shadcn@latest init
```

Select: React, Vite, default style, neutral base color.

- [ ] **Step 2: Install required shadcn components**

```bash
npx shadcn@latest add button input card table badge
```

- [ ] **Step 3: Verify components are installed in src/components/ui/**

---

### Task 3: Create 4 MD Folders with Sample Content

**Files:**
- Create: `content/notes/*.md` (3 files)
- Create: `content/guides/*.md` (3 files)
- Create: `content/logs/*.md` (3 files)
- Create: `content/ideas/*.md` (3 files)

Each .md file has YAML-like frontmatter comment at top:
```md
<!-- title: Example Title -->
<!-- date: 2026-04-06 -->
<!-- category: notes -->

# Example Title

Content here...
```

- [ ] **Step 1: Create content/notes/ with 3 .md files**
- [ ] **Step 2: Create content/guides/ with 3 .md files**
- [ ] **Step 3: Create content/logs/ with 3 .md files**
- [ ] **Step 4: Create content/ideas/ with 3 .md files**

---

### Task 4: Build Auth System

**Files:**
- Create: `src/contexts/AuthContext.jsx`
- Create: `src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Create AuthContext with login/logout/isAuthenticated**

Hardcoded credentials: `admin` / `admin123`
Store auth state in localStorage.

- [ ] **Step 2: Create ProtectedRoute component**

Redirects to `/login` if not authenticated.

---

### Task 5: Build Login Page

**Files:**
- Create: `src/pages/LoginPage.jsx`

- [ ] **Step 1: Create beautiful login page**

Full-screen centered card with:
- App logo/title
- Username & password inputs (shadcn Input)
- Login button (shadcn Button)
- Error message display
- Gradient background, glassmorphism card effect

---

### Task 6: Build Dashboard Page with MD Table

**Files:**
- Create: `src/pages/DashboardPage.jsx`
- Create: `src/lib/mdLoader.js`

- [ ] **Step 1: Create mdLoader.js**

Uses `import.meta.glob` to load all .md files from content/ folders.
Parses frontmatter comments, extracts metadata (title, date, category).
Returns array of { title, date, category, fileName, content, path }.

- [ ] **Step 2: Create DashboardPage with table view**

Header with app title, user info, logout button.
Filter bar: search input + category filter badges.
shadcn Table showing: title, category (badge), date, file path.
Clean, modern UI.

---

### Task 7: Set Up Routing & App Entry

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`
- Delete: `src/App.css`

- [ ] **Step 1: Update main.jsx with BrowserRouter and AuthProvider**
- [ ] **Step 2: Update App.jsx with routes: /login and / (protected)**
- [ ] **Step 3: Remove App.css (replaced by Tailwind)**

---
