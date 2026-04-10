# Multi-User Collaborative MD Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **User directive:** No git commits during execution. The user will test manually before committing anything. Skip all `git commit` steps. Natural "save points" between tasks are already provided by the task structure.

**Goal:** Turn MD Reader into a multi-user collaborative markdown editor with real user accounts, pessimistic file locking, realtime updates, and automatic "who edited what line" annotations.

**Architecture:** Single Node.js process (Express + Socket.IO) serves both the Vite-built React SPA and a small REST+WebSocket API. The filesystem is the database — markdown files live in `content/`, users in `data/users.json`, locks in `data/locks.json`. All annotation/lock logic runs server-side; the client fetches data via REST and subscribes to realtime events via Socket.IO.

**Tech Stack:** Node.js, Express, Socket.IO, bcrypt, jsonwebtoken, `diff`, nanoid, dotenv, concurrently (dev), CodeMirror 6, react-markdown, remark-gfm, sonner, @tailwindcss/typography. Frontend continues on React 19 + Vite + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-09-multi-user-md-editing-design.md`

---

## File map

**Create:**
- `server/index.js` — Express + Socket.IO bootstrap
- `server/routes/auth.js` — login, me
- `server/routes/files.js` — file CRUD + lock endpoints
- `server/middleware/auth.js` — JWT verification
- `server/middleware/role.js` — role guard factory
- `server/services/fileStore.js` — filesystem operations for content/
- `server/services/lockManager.js` — lock acquire/release/heartbeat/sweep
- `server/services/userStore.js` — users.json read/write, password verify
- `server/services/diffAnnotator.js` — line diff + comment injection
- `server/realtime.js` — Socket.IO connection + broadcast helpers
- `server/utils/paths.js` — base64url ↔ path + traversal protection
- `server/utils/frontmatter.js` — parse/serialize frontmatter (ported from mdLoader)
- `scripts/create-user.js` — interactive CLI
- `tests/diffAnnotator.test.js`
- `tests/lockManager.test.js`
- `tests/frontmatter.test.js`
- `data/users.json` — initially `[]`
- `data/locks.json` — initially `{}`
- `.env.example`
- `src/lib/api.js` — fetch wrapper with JWT
- `src/lib/dateFormat.js` — DD/MM/YYYY HH:mm
- `src/contexts/SocketContext.jsx`
- `src/pages/FilePage.jsx`
- `src/components/MarkdownEditor.jsx`
- `src/components/MarkdownPreview.jsx`
- `src/components/LockBadge.jsx`
- `src/components/PresenceIndicator.jsx`
- `src/components/NewFileDialog.jsx`
- `src/components/ui/alert-dialog.jsx` (shadcn)
- `src/components/ui/sonner.jsx` (shadcn)
- `src/components/ui/dialog.jsx` (shadcn)
- `src/components/ui/label.jsx` (shadcn)
- `src/components/ui/select.jsx` (shadcn)

**Modify:**
- `package.json` — scripts + dependencies
- `vite.config.js` — dev proxy for /api and /socket.io
- `.gitignore` — add `.env`, `data/*.json` already-populated (but keep `data/.gitkeep`)
- `src/App.jsx` — add FilePage route
- `src/main.jsx` — mount SocketProvider + Sonner Toaster
- `src/contexts/AuthContext.jsx` — migrate to JWT
- `src/pages/LoginPage.jsx` — call `/api/auth/login`
- `src/pages/DashboardPage.jsx` — fetch from `/api/files`, realtime events, row navigation

**Delete:**
- `src/lib/mdLoader.js` — replaced by server-side API

---

## Task 1: Dependencies & project scaffolding

**Files:**
- Modify: `package.json`
- Create: `.env.example`, `.gitignore` updates, `data/.gitkeep`, `data/users.json`, `data/locks.json`

- [ ] **Step 1: Install backend dependencies**

Run from project root:

```bash
npm install express socket.io bcrypt jsonwebtoken dotenv diff nanoid cors
```

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install socket.io-client @uiw/react-codemirror @codemirror/lang-markdown @codemirror/theme-one-dark react-markdown remark-gfm sonner @tailwindcss/typography
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D concurrently vitest supertest
```

- [ ] **Step 4: Update `package.json` scripts section**

Replace the `"scripts"` block with:

```json
  "scripts": {
    "dev:client": "vite",
    "dev:server": "node --watch server/index.js",
    "dev": "concurrently -n client,server -c cyan,magenta \"npm:dev:client\" \"npm:dev:server\"",
    "build": "vite build",
    "start": "node server/index.js",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "create-user": "node scripts/create-user.js"
  },
```

- [ ] **Step 5: Create `.env.example`**

```
PORT=3001
JWT_SECRET=change-me-to-a-long-random-string
NODE_ENV=development
```

- [ ] **Step 6: Create real `.env`**

Copy `.env.example` to `.env` and replace `JWT_SECRET` with a real random value:

```bash
cp .env.example .env
```

Then edit `.env` and set `JWT_SECRET` to a random string (at least 32 chars).

- [ ] **Step 7: Update `.gitignore`**

Append these lines at the end of `.gitignore`:

```
.env
data/users.json
data/locks.json
```

- [ ] **Step 8: Create `data/` folder structure**

```bash
mkdir -p data
```

Create `data/.gitkeep` (empty file) so the folder is tracked.
Create `data/users.json` with content `[]`.
Create `data/locks.json` with content `{}`.

- [ ] **Step 9: Verify install**

Run `npm run lint` to confirm nothing is broken.
Expected: existing ESLint passes (no changes to source yet).

---

## Task 2: Server bootstrap

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Write `server/index.js`**

```js
import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(PROJECT_ROOT, 'dist')
const IS_DEV = process.env.NODE_ENV !== 'production'

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Placeholder routes — filled in by later tasks
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Static serving (production only — in dev Vite serves the SPA)
if (!IS_DEV) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 3001
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})

export { app, server, PROJECT_ROOT }
```

- [ ] **Step 2: Run the server**

```bash
node server/index.js
```

Expected: `[server] listening on http://localhost:3001`

- [ ] **Step 3: Verify health endpoint**

In another terminal:

```bash
curl http://localhost:3001/api/health
```

Expected: `{"ok":true}`

Stop the server with Ctrl+C.

---

## Task 3: Path utilities & frontmatter parser

**Files:**
- Create: `server/utils/paths.js`
- Create: `server/utils/frontmatter.js`
- Create: `tests/frontmatter.test.js`

- [ ] **Step 1: Write `server/utils/paths.js`**

```js
import path from 'path'
import { PROJECT_ROOT } from '../index.js'

// base64url-encode a relative path for use as a URL :id parameter
export function encodeId(relativePath) {
  return Buffer.from(relativePath, 'utf8').toString('base64url')
}

// Decode :id back to a relative path
export function decodeId(id) {
  return Buffer.from(id, 'base64url').toString('utf8')
}

// Resolve a relative path under a given root dir, throw if it escapes
export function safeResolve(rootDir, relativePath) {
  const absRoot = path.resolve(PROJECT_ROOT, rootDir)
  const absTarget = path.resolve(absRoot, relativePath.replace(/^\/+/, ''))
  if (!absTarget.startsWith(absRoot + path.sep) && absTarget !== absRoot) {
    throw new Error('Path traversal attempt blocked')
  }
  return absTarget
}
```

Note: the import from `../index.js` creates a circular dependency. Fix by moving `PROJECT_ROOT` to its own file:

- [ ] **Step 2: Extract `PROJECT_ROOT` into `server/utils/root.js`**

Create `server/utils/root.js`:

```js
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
export const CONTENT_ROOT = path.join(PROJECT_ROOT, 'content')
export const DATA_ROOT = path.join(PROJECT_ROOT, 'data')
export const DIST_DIR = path.join(PROJECT_ROOT, 'dist')
```

- [ ] **Step 3: Update `server/utils/paths.js` to import from `root.js`**

```js
import path from 'path'
import { PROJECT_ROOT } from './root.js'

export function encodeId(relativePath) {
  return Buffer.from(relativePath, 'utf8').toString('base64url')
}

export function decodeId(id) {
  return Buffer.from(id, 'base64url').toString('utf8')
}

export function safeResolve(rootDir, relativePath) {
  const absRoot = path.resolve(PROJECT_ROOT, rootDir)
  const cleaned = relativePath.replace(/^\/+/, '')
  const absTarget = path.resolve(absRoot, cleaned)
  if (absTarget !== absRoot && !absTarget.startsWith(absRoot + path.sep)) {
    throw new Error('Path traversal attempt blocked')
  }
  return absTarget
}
```

- [ ] **Step 4: Update `server/index.js` to use `root.js`**

Replace the `__dirname` and `PROJECT_ROOT`/`DIST_DIR` block with:

```js
import { PROJECT_ROOT, DIST_DIR } from './utils/root.js'
```

And remove the `export { ... PROJECT_ROOT }` line at the bottom.

- [ ] **Step 5: Write `server/utils/frontmatter.js`**

```js
// Parse HTML-comment frontmatter, e.g. <!-- title: Foo -->
// Frontmatter = contiguous comment lines + blank lines at file start.
// Everything after is the body.
export function parseFrontmatter(raw) {
  const lines = raw.split('\n')
  const meta = {}
  let bodyStart = 0
  let sawMeta = false

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^<!--\s*(\w+):\s*(.+?)\s*-->$/)
    if (match) {
      meta[match[1]] = match[2]
      bodyStart = i + 1
      sawMeta = true
    } else if (lines[i].trim() === '') {
      if (sawMeta) bodyStart = i + 1
      else bodyStart = i + 1 // leading blank lines are still frontmatter region
    } else {
      break
    }
  }

  return {
    meta,
    frontmatterLines: lines.slice(0, bodyStart),
    body: lines.slice(bodyStart).join('\n'),
  }
}

// Rebuild a full file from frontmatterLines + body
export function serialize(frontmatterLines, body) {
  if (frontmatterLines.length === 0) return body
  return frontmatterLines.join('\n') + (body.startsWith('\n') ? '' : '\n') + body
}
```

- [ ] **Step 6: Write `tests/frontmatter.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { parseFrontmatter, serialize } from '../server/utils/frontmatter.js'

describe('parseFrontmatter', () => {
  it('extracts simple meta fields', () => {
    const raw = `<!-- title: Hello -->\n<!-- date: 2025-01-01 -->\n\n# Body`
    const { meta, body } = parseFrontmatter(raw)
    expect(meta).toEqual({ title: 'Hello', date: '2025-01-01' })
    expect(body).toBe('# Body')
  })

  it('handles files with no frontmatter', () => {
    const raw = `# Just a heading\nNo meta here`
    const { meta, body } = parseFrontmatter(raw)
    expect(meta).toEqual({})
    expect(body).toBe('# Just a heading\nNo meta here')
  })

  it('preserves body after blank line separator', () => {
    const raw = `<!-- title: T -->\n\nLine 1\nLine 2`
    const { body } = parseFrontmatter(raw)
    expect(body).toBe('Line 1\nLine 2')
  })
})

describe('serialize', () => {
  it('reassembles frontmatter + body', () => {
    const raw = `<!-- title: T -->\n\n# Body\nMore`
    const { frontmatterLines, body } = parseFrontmatter(raw)
    const rebuilt = serialize(frontmatterLines, body)
    expect(rebuilt).toBe(raw)
  })
})
```

- [ ] **Step 7: Run frontmatter tests**

```bash
npm test -- frontmatter
```

Expected: all 4 tests pass.

---

## Task 4: Diff annotator (TDD — core correctness)

**Files:**
- Create: `server/services/diffAnnotator.js`
- Create: `tests/diffAnnotator.test.js`

- [ ] **Step 1: Write `tests/diffAnnotator.test.js` (failing tests first)**

```js
import { describe, it, expect } from 'vitest'
import { annotate } from '../server/services/diffAnnotator.js'

const user = { displayName: 'Gorkem' }
const date = new Date('2026-04-09T14:30:00')

describe('annotate', () => {
  it('returns original body unchanged when nothing changed', () => {
    const old = `line 1\nline 2\nline 3`
    const result = annotate(old, old, user, date)
    expect(result).toBe(old)
  })

  it('adds a comment above a modified line', () => {
    const old = `line 1\nline 2\nline 3`
    const next = `line 1\nline TWO\nline 3`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `line 1\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nline TWO\nline 3`
    )
  })

  it('adds a single comment above a contiguous block of changed lines', () => {
    const old = `a\nb\nc\nd\ne`
    const next = `a\nB\nC\nD\ne`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nC\nD\ne`
    )
  })

  it('adds comments above multiple separate change blocks', () => {
    const old = `a\nb\nc\nd\ne`
    const next = `a\nB\nc\nD\ne`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nc\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nD\ne`
    )
  })

  it('adds a comment above purely inserted lines', () => {
    const old = `a\nb\nc`
    const next = `a\nb\nnew1\nnew2\nc`
    const result = annotate(old, next, user, date)
    expect(result).toBe(
      `a\nb\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nnew1\nnew2\nc`
    )
  })

  it('does not add comment for purely deleted lines', () => {
    const old = `a\nb\nc\nd`
    const next = `a\nd`
    const result = annotate(old, next, user, date)
    expect(result).toBe(`a\nd`)
  })

  it('updates timestamp when the same user edits adjacent to their existing comment', () => {
    const old = `a\n<!-- düzenleyen: Gorkem — 01/01/2026 10:00 -->\nb\nc`
    const next = `a\n<!-- düzenleyen: Gorkem — 01/01/2026 10:00 -->\nB\nc`
    const result = annotate(old, next, user, date)
    // Existing comment replaced with new timestamp (same user)
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\nB\nc`
    )
  })

  it('prepends a new comment when a different user edits', () => {
    const old = `a\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nb\nc`
    const next = `a\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nB\nc`
    const result = annotate(old, next, user, date)
    // New Gorkem comment above existing Ayşe comment
    expect(result).toBe(
      `a\n<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->\n<!-- düzenleyen: Ayşe — 01/01/2026 10:00 -->\nB\nc`
    )
  })

  it('formats date as DD/MM/YYYY HH:mm with zero padding', () => {
    const old = `x`
    const next = `Y`
    const result = annotate(old, next, user, new Date('2026-01-05T03:07:00'))
    expect(result).toContain('05/01/2026 03:07')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- diffAnnotator
```

Expected: 9 failures with "Cannot find module '../server/services/diffAnnotator.js'".

- [ ] **Step 3: Write `server/services/diffAnnotator.js`**

```js
import { diffLines } from 'diff'

const COMMENT_RE = /^<!--\s*düzenleyen:\s*(.+?)\s+—\s+(.+?)\s*-->$/

function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function makeComment(displayName, date) {
  return `<!-- düzenleyen: ${displayName} — ${formatDate(date)} -->`
}

// Walk diff output into a line-level sequence of {kind, line} where
// kind ∈ {'same','added','removed'}. Added and removed are emitted per-line.
function toLineOps(oldText, newText) {
  const chunks = diffLines(oldText, newText)
  const ops = []
  for (const chunk of chunks) {
    const lines = chunk.value.split('\n')
    // diffLines keeps the trailing newline in the last chunk sometimes
    // creating an empty final element — drop it unless the text ended with \n
    if (lines[lines.length - 1] === '') lines.pop()
    for (const line of lines) {
      if (chunk.added) ops.push({ kind: 'added', line })
      else if (chunk.removed) ops.push({ kind: 'removed', line })
      else ops.push({ kind: 'same', line })
    }
  }
  return ops
}

export function annotate(oldText, newText, user, date = new Date()) {
  if (oldText === newText) return newText

  const ops = toLineOps(oldText, newText)
  const result = []
  const newComment = makeComment(user.displayName, date)

  let i = 0
  while (i < ops.length) {
    const op = ops[i]

    if (op.kind === 'removed') {
      // Skip removed lines. If the line immediately before in result is
      // an annotation that was attached to this removed line, that's fine —
      // we leave it alone; the annotation may still apply to the next kept line.
      i++
      continue
    }

    if (op.kind === 'same') {
      result.push(op.line)
      i++
      continue
    }

    // op.kind === 'added' — start of a change block
    // Look at the line just written to `result` (if any) — it may be an
    // existing annotation we need to merge with.
    let existingAnnotationIndex = -1
    let existingUser = null
    if (result.length > 0) {
      const prev = result[result.length - 1]
      const m = prev.match(COMMENT_RE)
      if (m) {
        existingAnnotationIndex = result.length - 1
        existingUser = m[1]
      }
    }

    if (existingAnnotationIndex >= 0) {
      if (existingUser === user.displayName) {
        // Same user — replace the existing annotation with fresh timestamp
        result[existingAnnotationIndex] = newComment
      } else {
        // Different user — insert new annotation above the existing one
        result.splice(existingAnnotationIndex, 0, newComment)
      }
    } else {
      result.push(newComment)
    }

    // Consume the whole contiguous block of added lines (and any interleaved removes)
    while (i < ops.length && (ops[i].kind === 'added' || ops[i].kind === 'removed')) {
      if (ops[i].kind === 'added') result.push(ops[i].line)
      i++
    }
  }

  return result.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- diffAnnotator
```

Expected: all 9 tests pass. If any fail, read the diff carefully — the most common issue is with `diffLines` splitting on trailing newlines. Adjust `toLineOps` if needed.

---

## Task 5: User store + password verification

**Files:**
- Create: `server/services/userStore.js`

- [ ] **Step 1: Write `server/services/userStore.js`**

```js
import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
import { DATA_ROOT } from '../utils/root.js'

const USERS_FILE = path.join(DATA_ROOT, 'users.json')

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_ROOT, { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

export async function listUsers() {
  const users = await readUsers()
  return users.map(({ passwordHash, ...rest }) => rest)
}

export async function findByUsername(username) {
  const users = await readUsers()
  return users.find(u => u.username === username) || null
}

export async function findById(id) {
  const users = await readUsers()
  return users.find(u => u.id === id) || null
}

export async function verifyPassword(username, plainPassword) {
  const user = await findByUsername(username)
  if (!user) return null
  const ok = await bcrypt.compare(plainPassword, user.passwordHash)
  if (!ok) return null
  const { passwordHash, ...safe } = user
  return safe
}

export async function createUser({ username, displayName, password, role }) {
  if (!['viewer', 'editor', 'admin'].includes(role)) {
    throw new Error(`Invalid role: ${role}`)
  }
  const users = await readUsers()
  if (users.some(u => u.username === username)) {
    throw new Error(`Username already exists: ${username}`)
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    id: `u_${nanoid(10)}`,
    username,
    displayName,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  await writeUsers(users)
  const { passwordHash: _, ...safe } = user
  return safe
}
```

- [ ] **Step 2: Verify the file is syntactically valid**

```bash
node --check server/services/userStore.js
```

Expected: no output (success).

---

## Task 6: CLI create-user script

**Files:**
- Create: `scripts/create-user.js`

- [ ] **Step 1: Write `scripts/create-user.js`**

```js
#!/usr/bin/env node
import readline from 'readline'
import { createUser } from '../server/services/userStore.js'

function ask(rl, question, { silent = false } = {}) {
  return new Promise(resolve => {
    if (!silent) {
      rl.question(question, answer => resolve(answer.trim()))
      return
    }
    // Silent (password) input
    process.stdout.write(question)
    const stdin = process.openStdin()
    process.stdin.on('data', char => {
      const c = char.toString()
      if (c === '\n' || c === '\r' || c === '\u0004') {
        process.stdin.pause()
      } else {
        process.stdout.write('\x1B[2K\x1B[200D' + question + '*'.repeat(rl.line.length))
      }
    })
    rl.question('', answer => {
      process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n  Create MD Reader user\n')
  const username = await ask(rl, '  Username: ')
  const displayName = await ask(rl, '  Display name: ')
  const password = await ask(rl, '  Password: ', { silent: true })
  const confirm = await ask(rl, '  Confirm password: ', { silent: true })
  if (password !== confirm) {
    console.error('\n  ✗ Passwords do not match.')
    rl.close()
    process.exit(1)
  }
  const role = (await ask(rl, '  Role (viewer/editor/admin) [editor]: ')) || 'editor'

  try {
    const user = await createUser({ username, displayName, password, role })
    console.log(`\n  ✓ Created user: ${user.username} (${user.role}) — id ${user.id}\n`)
  } catch (e) {
    console.error(`\n  ✗ ${e.message}\n`)
    process.exit(1)
  }
  rl.close()
}

main()
```

- [ ] **Step 2: Run the CLI to create an admin user**

```bash
npm run create-user
```

Follow the prompts. Set username, display name, a password, and role `admin`.

Expected: `✓ Created user: <name> (admin)` and `data/users.json` now contains the entry.

- [ ] **Step 3: Verify the users file**

Open `data/users.json` in an editor and confirm the user is present with a bcrypt hash (starts with `$2b$`).

---

## Task 7: JWT middleware + auth routes

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/middleware/role.js`
- Create: `server/routes/auth.js`
- Modify: `server/index.js`

- [ ] **Step 1: Write `server/middleware/auth.js`**

```js
import jwt from 'jsonwebtoken'
import { findById } from '../services/userStore.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    findById(payload.sub).then(user => {
      if (!user) return res.status(401).json({ error: 'User not found' })
      const { passwordHash, ...safe } = user
      req.user = safe
      next()
    }).catch(next)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}
```

- [ ] **Step 2: Write `server/middleware/role.js`**

```js
const ORDER = { viewer: 0, editor: 1, admin: 2 }

export function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel = ORDER[req.user?.role] ?? -1
    const needed = ORDER[minRole] ?? 99
    if (userLevel < needed) {
      return res.status(403).json({ error: `Requires role: ${minRole}` })
    }
    next()
  }
}
```

- [ ] **Step 3: Write `server/routes/auth.js`**

```js
import { Router } from 'express'
import { verifyPassword } from '../services/userStore.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  const user = await verifyPassword(username, password)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user)
  res.json({ token, user })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
```

- [ ] **Step 4: Wire routes in `server/index.js`**

In `server/index.js`, add import and route registration after `app.use(express.json(...))`:

```js
import authRoutes from './routes/auth.js'
// ...
app.use('/api/auth', authRoutes)
```

- [ ] **Step 5: Manual test: login**

Start server: `node server/index.js`

In another terminal:

```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"<your-username>","password":"<your-password>"}'
```

Expected: JSON with `token` and `user` fields. Copy the token.

```bash
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer <paste-token>"
```

Expected: `{"user":{...}}` with your user data.

Stop the server.

---

## Task 8: File store service

**Files:**
- Create: `server/services/fileStore.js`

- [ ] **Step 1: Write `server/services/fileStore.js`**

```js
import fs from 'fs/promises'
import path from 'path'
import { CONTENT_ROOT } from '../utils/root.js'
import { safeResolve, encodeId, decodeId } from '../utils/paths.js'
import { parseFrontmatter, serialize } from '../utils/frontmatter.js'

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(full)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function toRelative(absPath) {
  return path.relative(path.resolve(CONTENT_ROOT, '..'), absPath).split(path.sep).join('/')
}

export async function listFiles() {
  await fs.mkdir(CONTENT_ROOT, { recursive: true })
  const absPaths = await walk(CONTENT_ROOT)
  const files = await Promise.all(
    absPaths.map(async abs => {
      const relative = toRelative(abs)
      const raw = await fs.readFile(abs, 'utf8')
      const { meta, body } = parseFrontmatter(raw)
      const parts = relative.split('/')
      const fileName = parts[parts.length - 1]
      const folder = parts[parts.length - 2]
      return {
        id: encodeId(relative),
        path: relative,
        title: meta.title || fileName.replace('.md', ''),
        date: meta.date || 'Bilinmiyor',
        category: meta.category || folder,
        fileName,
        wordCount: body.split(/\s+/).filter(Boolean).length,
      }
    })
  )
  files.sort((a, b) => new Date(b.date) - new Date(a.date))
  return files
}

export async function readFile(id) {
  const relative = decodeId(id)
  const abs = safeResolve('content', path.basename(relative) === relative ? relative : relative.replace(/^content\//, ''))
  const raw = await fs.readFile(abs, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const parts = relative.split('/')
  const fileName = parts[parts.length - 1]
  const folder = parts[parts.length - 2]
  return {
    id,
    path: relative,
    title: meta.title || fileName.replace('.md', ''),
    date: meta.date || 'Bilinmiyor',
    category: meta.category || folder,
    fileName,
    content: raw, // full raw including frontmatter
    body,
    meta,
  }
}

export async function writeFileContent(id, fullContent) {
  const relative = decodeId(id)
  const abs = safeResolve('content', relative.replace(/^content\//, ''))
  await fs.writeFile(abs, fullContent, 'utf8')
}

export async function createFile({ category, fileName, title, content }) {
  if (!/^[\w\- ]+\.md$/.test(fileName)) {
    throw new Error('Invalid file name (letters, numbers, -, _, space, .md only)')
  }
  if (!/^[\w\-]+$/.test(category)) {
    throw new Error('Invalid category')
  }
  const relative = `content/${category}/${fileName}`
  const abs = safeResolve('content', `${category}/${fileName}`)
  try {
    await fs.access(abs)
    throw new Error('File already exists')
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  await fs.mkdir(path.dirname(abs), { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const frontmatter =
    `<!-- title: ${title || fileName.replace('.md', '')} -->\n` +
    `<!-- date: ${today} -->\n` +
    `<!-- category: ${category} -->\n\n`
  await fs.writeFile(abs, frontmatter + (content || ''), 'utf8')
  return { id: encodeId(relative), path: relative }
}

export async function deleteFile(id) {
  const relative = decodeId(id)
  const abs = safeResolve('content', relative.replace(/^content\//, ''))
  await fs.unlink(abs)
}
```

- [ ] **Step 2: Verify syntactic validity**

```bash
node --check server/services/fileStore.js
```

Expected: no output.

---

## Task 9: Lock manager (TDD)

**Files:**
- Create: `server/services/lockManager.js`
- Create: `tests/lockManager.test.js`

- [ ] **Step 1: Write `tests/lockManager.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createLockManager } from '../server/services/lockManager.js'

let tmpDir
let lockFile
let manager

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lock-test-'))
  lockFile = path.join(tmpDir, 'locks.json')
  manager = await createLockManager({ lockFile, staleMs: 2000 })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
  vi.useRealTimers()
})

const alice = { id: 'u1', username: 'alice', displayName: 'Alice' }
const bob = { id: 'u2', username: 'bob', displayName: 'Bob' }

describe('lockManager', () => {
  it('acquires a lock for a file', async () => {
    const result = await manager.acquire('content/a.md', alice)
    expect(result.ok).toBe(true)
    expect(result.lock.userId).toBe('u1')
  })

  it('rejects lock when already held by another user', async () => {
    await manager.acquire('content/a.md', alice)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(false)
    expect(result.holder.userId).toBe('u1')
  })

  it('allows same user to re-acquire (refresh)', async () => {
    await manager.acquire('content/a.md', alice)
    const result = await manager.acquire('content/a.md', alice)
    expect(result.ok).toBe(true)
  })

  it('releases a lock', async () => {
    await manager.acquire('content/a.md', alice)
    await manager.release('content/a.md', alice)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(true)
  })

  it('does not release a lock held by someone else', async () => {
    await manager.acquire('content/a.md', alice)
    await manager.release('content/a.md', bob)
    const result = await manager.acquire('content/a.md', bob)
    expect(result.ok).toBe(false)
  })

  it('updates heartbeat', async () => {
    await manager.acquire('content/a.md', alice)
    const before = manager.get('content/a.md').lastHeartbeat
    await new Promise(r => setTimeout(r, 10))
    const ok = await manager.heartbeat('content/a.md', alice)
    expect(ok).toBe(true)
    expect(manager.get('content/a.md').lastHeartbeat).not.toBe(before)
  })

  it('sweeps stale locks', async () => {
    await manager.acquire('content/a.md', alice)
    // Manually age the lock
    const lock = manager.get('content/a.md')
    lock.lastHeartbeat = new Date(Date.now() - 10_000).toISOString()
    const released = await manager.sweep()
    expect(released).toContain('content/a.md')
    expect(manager.get('content/a.md')).toBeNull()
  })

  it('persists to disk and reloads', async () => {
    await manager.acquire('content/a.md', alice)
    const manager2 = await createLockManager({ lockFile, staleMs: 2000 })
    expect(manager2.get('content/a.md').userId).toBe('u1')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- lockManager
```

Expected: all fail with module not found.

- [ ] **Step 3: Write `server/services/lockManager.js`**

```js
import fs from 'fs/promises'
import path from 'path'

export async function createLockManager({ lockFile, staleMs = 2 * 60 * 1000 }) {
  let state = {}

  async function load() {
    try {
      const raw = await fs.readFile(lockFile, 'utf8')
      state = JSON.parse(raw)
    } catch (e) {
      if (e.code === 'ENOENT') state = {}
      else throw e
    }
  }

  async function persist() {
    await fs.mkdir(path.dirname(lockFile), { recursive: true })
    await fs.writeFile(lockFile, JSON.stringify(state, null, 2))
  }

  await load()

  function get(filePath) {
    return state[filePath] || null
  }

  async function acquire(filePath, user) {
    const existing = state[filePath]
    if (existing && existing.userId !== user.id) {
      return { ok: false, holder: existing }
    }
    const now = new Date().toISOString()
    state[filePath] = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      acquiredAt: existing?.acquiredAt || now,
      lastHeartbeat: now,
    }
    await persist()
    return { ok: true, lock: state[filePath] }
  }

  async function release(filePath, user) {
    const existing = state[filePath]
    if (!existing) return false
    if (existing.userId !== user.id) return false
    delete state[filePath]
    await persist()
    return true
  }

  async function forceRelease(filePath) {
    if (!state[filePath]) return false
    delete state[filePath]
    await persist()
    return true
  }

  async function heartbeat(filePath, user) {
    const existing = state[filePath]
    if (!existing || existing.userId !== user.id) return false
    existing.lastHeartbeat = new Date().toISOString()
    await persist()
    return true
  }

  async function sweep() {
    const now = Date.now()
    const released = []
    for (const [filePath, lock] of Object.entries(state)) {
      const age = now - new Date(lock.lastHeartbeat).getTime()
      if (age > staleMs) {
        released.push(filePath)
        delete state[filePath]
      }
    }
    if (released.length > 0) await persist()
    return released
  }

  function all() {
    return { ...state }
  }

  return { acquire, release, forceRelease, heartbeat, sweep, get, all }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lockManager
```

Expected: all 8 tests pass.

---

## Task 10: Files API routes

**Files:**
- Create: `server/routes/files.js`
- Modify: `server/index.js` — instantiate lock manager, mount routes

- [ ] **Step 1: Create a shared lock manager singleton**

Create `server/services/locks.js`:

```js
import path from 'path'
import { DATA_ROOT } from '../utils/root.js'
import { createLockManager } from './lockManager.js'

export const locks = await createLockManager({
  lockFile: path.join(DATA_ROOT, 'locks.json'),
  staleMs: 2 * 60 * 1000,
})
```

- [ ] **Step 2: Write `server/routes/files.js`**

```js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import {
  listFiles,
  readFile,
  writeFileContent,
  createFile,
  deleteFile,
} from '../services/fileStore.js'
import { locks } from '../services/locks.js'
import { annotate } from '../services/diffAnnotator.js'
import { parseFrontmatter, serialize } from '../utils/frontmatter.js'
import { decodeId } from '../utils/paths.js'
import { broadcast } from '../realtime.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const files = await listFiles()
    const withLocks = files.map(f => ({ ...f, lock: locks.get(f.path) }))
    res.json({ files: withLocks })
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const file = await readFile(req.params.id)
    res.json({ file, lock: locks.get(file.path) })
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    next(e)
  }
})

router.post('/:id/lock', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const result = await locks.acquire(filePath, req.user)
    if (!result.ok) {
      return res.status(409).json({ error: 'Locked', holder: result.holder })
    }
    broadcast('lock:acquired', { id: req.params.id, path: filePath, holder: result.lock })
    res.json({ lock: result.lock })
  } catch (e) { next(e) }
})

router.post('/:id/lock/heartbeat', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const ok = await locks.heartbeat(filePath, req.user)
    if (!ok) return res.status(409).json({ error: 'Lock lost' })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

router.delete('/:id/lock', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const released = await locks.release(filePath, req.user)
    if (released) {
      broadcast('lock:released', { id: req.params.id, path: filePath })
    }
    res.json({ ok: true })
  } catch (e) { next(e) }
})

router.put('/:id', requireRole('editor'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const lock = locks.get(filePath)
    if (!lock || lock.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not hold the lock for this file' })
    }
    const { content: newRaw } = req.body || {}
    if (typeof newRaw !== 'string') {
      return res.status(400).json({ error: 'content (string) required' })
    }
    const current = await readFile(req.params.id)
    const oldParsed = parseFrontmatter(current.content)
    const newParsed = parseFrontmatter(newRaw)
    // Frontmatter is a protected region — we do not annotate it.
    // We re-use the incoming frontmatter verbatim (so the user can edit
    // title/category/date through the raw editor if they want) and only
    // annotate body changes.
    const annotatedBody = annotate(oldParsed.body, newParsed.body, req.user, new Date())
    const finalRaw = serialize(newParsed.frontmatterLines, annotatedBody)
    await writeFileContent(req.params.id, finalRaw)
    await locks.heartbeat(filePath, req.user)
    broadcast('file:updated', {
      id: req.params.id,
      path: filePath,
      updatedBy: { id: req.user.id, displayName: req.user.displayName },
      updatedAt: new Date().toISOString(),
    })
    const updated = await readFile(req.params.id)
    res.json({ file: updated })
  } catch (e) { next(e) }
})

router.post('/', requireRole('editor'), async (req, res, next) => {
  try {
    const { category, fileName, title, content } = req.body || {}
    if (!category || !fileName) {
      return res.status(400).json({ error: 'category and fileName required' })
    }
    const { id, path: relative } = await createFile({ category, fileName, title, content })
    broadcast('file:created', { id })
    res.status(201).json({ id, path: relative })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const filePath = decodeId(req.params.id)
    const lock = locks.get(filePath)
    if (lock && lock.userId !== req.user.id) {
      return res.status(409).json({ error: 'File is locked by another user', holder: lock })
    }
    await deleteFile(req.params.id)
    await locks.forceRelease(filePath)
    broadcast('file:deleted', { id: req.params.id, path: filePath })
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
    next(e)
  }
})

export default router
```

- [ ] **Step 3: Create stub `server/realtime.js`**

```js
let io = null

export function initRealtime(httpServer) {
  // Filled in by Task 11
  return io
}

export function broadcast(event, payload) {
  if (io) io.emit(event, payload)
}
```

- [ ] **Step 4: Wire routes + sweep timer in `server/index.js`**

Add imports near the top:

```js
import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'
import { locks } from './services/locks.js'
import { initRealtime, broadcast } from './realtime.js'
```

Add route registration (after `/api/health`):

```js
app.use('/api/auth', authRoutes)
app.use('/api/files', filesRoutes)
```

Add stale sweep timer before `server.listen`:

```js
setInterval(async () => {
  const released = await locks.sweep()
  for (const filePath of released) {
    broadcast('lock:released', { path: filePath })
  }
}, 30_000)

initRealtime(server)
```

- [ ] **Step 5: Manual test: list files**

Start server: `node server/index.js`

Get a token (from Task 7 test), then:

```bash
curl http://localhost:3001/api/files -H "Authorization: Bearer <token>"
```

Expected: JSON with `files` array, each entry has `id`, `title`, `path`, and `lock: null`.

- [ ] **Step 6: Manual test: acquire lock**

Pick an `id` from the files list, then:

```bash
curl -X POST http://localhost:3001/api/files/<id>/lock -H "Authorization: Bearer <token>"
```

Expected: `{"lock":{"userId":"...","displayName":"...","acquiredAt":"...","lastHeartbeat":"..."}}`

Try again with the same token — should succeed (refresh).
Try again with a fresh token from a different user (create a second user via `npm run create-user` if needed) — should return 409.

- [ ] **Step 7: Manual test: save file with annotation**

Release the lock, re-acquire it, then PUT new content:

```bash
curl -X PUT http://localhost:3001/api/files/<id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"<!-- title: Test -->\n\n# Hello\n\nModified line\n"}'
```

Expected: 200 with updated file. Open the actual .md file in your editor and verify a `<!-- düzenleyen: ... -->` comment was injected above the modified line.

Stop the server and release the lock for your manual test file so you start clean for next tasks.

---

## Task 11: Socket.IO integration

**Files:**
- Modify: `server/realtime.js`
- Modify: `server/index.js`

- [ ] **Step 1: Rewrite `server/realtime.js` with real Socket.IO setup**

```js
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { findById } from './services/userStore.js'

let io = null
const onlineUsers = new Map() // socketId → { id, displayName, role }

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Missing token'))
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await findById(payload.sub)
      if (!user) return next(new Error('User not found'))
      const { passwordHash, ...safe } = user
      socket.data.user = safe
      next()
    } catch (e) {
      next(new Error('Auth failed'))
    }
  })

  io.on('connection', socket => {
    const user = socket.data.user
    onlineUsers.set(socket.id, {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
    })
    emitPresence()

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id)
      emitPresence()
    })
  })

  return io
}

function emitPresence() {
  const unique = new Map()
  for (const u of onlineUsers.values()) {
    unique.set(u.id, u)
  }
  io?.emit('presence:update', Array.from(unique.values()))
}

export function broadcast(event, payload) {
  if (io) io.emit(event, payload)
}
```

- [ ] **Step 2: Confirm `server/index.js` already calls `initRealtime(server)` (from Task 10 Step 4)**

If it doesn't, add it just before `server.listen(...)`.

- [ ] **Step 3: Manual test: Socket.IO handshake**

Start the server. In a browser console at `http://localhost:3001/api/health` (or any page), run:

```js
// Fetch a token first
const res = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: '<you>', password: '<pw>' }),
})
const { token } = await res.json()
const s = io('http://localhost:3001', { auth: { token } })
s.on('presence:update', p => console.log('presence', p))
```

(You will need to `<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>` on the page or test this later from the React client.)

Realistically, defer full verification to Task 15 when the client is wired up. For now just confirm the server doesn't crash on startup.

---

## Task 12: Vite dev proxy + production static serving

**Files:**
- Modify: `vite.config.js`
- Confirm: `server/index.js` serves `dist/` in production (already done in Task 2)

- [ ] **Step 1: Update `vite.config.js`**

Replace the file contents with:

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
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
```

- [ ] **Step 2: Run dev mode**

```bash
npm run dev
```

Expected: both Vite (`:5173`) and Node (`:3001`) start. Visit `http://localhost:5173/api/health` — should show `{"ok":true}` (proxied).

Stop with Ctrl+C.

---

## Task 13: Frontend utility libs + API client

**Files:**
- Delete: `src/lib/mdLoader.js`
- Create: `src/lib/api.js`
- Create: `src/lib/dateFormat.js`

- [ ] **Step 1: Write `src/lib/api.js`**

```js
const TOKEN_KEY = 'md-reader-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(method, url, body, { raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    setToken(null)
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
}
```

- [ ] **Step 2: Write `src/lib/dateFormat.js`**

```js
function pad(n) {
  return String(n).padStart(2, '0')
}

// DD/MM/YYYY HH:mm
export function formatDateTime(input) {
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
```

- [ ] **Step 3: Delete `src/lib/mdLoader.js`**

```bash
rm src/lib/mdLoader.js
```

---

## Task 14: Migrate AuthContext + LoginPage to JWT

**Files:**
- Modify: `src/contexts/AuthContext.jsx`
- Modify: `src/pages/LoginPage.jsx`

- [ ] **Step 1: Rewrite `src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getToken, setToken } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    try {
      const data = await api.post('/api/auth/login', { username, password })
      setToken(data.token)
      setUser(data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.data?.error || e.message || 'Login failed' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Update `src/pages/LoginPage.jsx`**

Find the login handler (where it currently calls `login(username, password)` returning a boolean) and update it to handle async:

Open `src/pages/LoginPage.jsx`, locate the function that handles form submission, and change it so:

1. The form submit handler is `async`.
2. It calls `const result = await login(username, password)`.
3. On `result.ok` it navigates to `/`.
4. On failure it shows `result.error` in the existing error state.

If the original code was:
```js
if (login(username, password)) navigate('/')
else setError('...')
```

Change to:
```js
const result = await login(username, password)
if (result.ok) navigate('/')
else setError(result.error)
```

- [ ] **Step 3: Update `ProtectedRoute` to handle the loading state**

Open `src/components/ProtectedRoute.jsx` and add a loading guard. Replace the component with:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute({ children, minRole }) {
  const { isAuthenticated, loading, user } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Yükleniyor...
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (minRole) {
    const order = { viewer: 0, editor: 1, admin: 2 }
    if ((order[user?.role] ?? -1) < (order[minRole] ?? 99)) {
      return <Navigate to="/" replace />
    }
  }
  return children
}
```

- [ ] **Step 4: Manual test: login flow end-to-end**

Run `npm run dev`. Visit `http://localhost:5173/login`. Log in with the user you created in Task 6.

Expected: Redirects to `/`, dashboard shows. Open devtools Application tab — `md-reader-token` is in localStorage.

Note: the dashboard will currently be broken because it still imports from the deleted `mdLoader.js`. The next task fixes this.

---

## Task 15: Dashboard migration to API

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Replace the `loadMarkdownFiles` import and data-loading in `src/pages/DashboardPage.jsx`**

Remove:
```js
import { loadMarkdownFiles } from '@/lib/mdLoader'
```

Add at the top:
```js
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
```

Replace:
```js
const allFiles = useMemo(() => loadMarkdownFiles(), [])
```

With:
```js
const [allFiles, setAllFiles] = useState([])
const [loadingFiles, setLoadingFiles] = useState(true)
const navigate = useNavigate()

useEffect(() => {
  let mounted = true
  api.get('/api/files')
    .then(data => { if (mounted) setAllFiles(data.files) })
    .catch(() => {})
    .finally(() => { if (mounted) setLoadingFiles(false) })
  return () => { mounted = false }
}, [])
```

- [ ] **Step 2: Make rows navigable**

In the `FileTable` component (same file), change the `TableRow` to accept an `onClick`. Pass `navigate` in from the parent and add click handling:

Change `FileTable` signature to `function FileTable({ files, onRowClick })` and add `onClick={() => onRowClick(file)}` to `<TableRow>`.

In the parent, pass: `<FileTable files={...} onRowClick={file => navigate(\`/file/${file.id}\`)} />`.

- [ ] **Step 3: Manual test**

Start `npm run dev`, log in, see files. Click a row — URL changes to `/file/<id>`. FilePage doesn't exist yet so you'll see a blank / 404. That's expected; next task creates it.

---

## Task 16: SocketContext + realtime dashboard integration

**Files:**
- Create: `src/contexts/SocketContext.jsx`
- Modify: `src/main.jsx` — mount SocketProvider
- Modify: `src/pages/DashboardPage.jsx` — subscribe to events

- [ ] **Step 1: Write `src/contexts/SocketContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const socketRef = useRef(null)
  const [presence, setPresence] = useState([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      return
    }
    const token = getToken()
    if (!token) return

    const socket = io({
      auth: { token },
      reconnection: true,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('presence:update', list => setPresence(list))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated])

  const on = (event, handler) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on(event, handler)
    return () => s.off(event, handler)
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, presence, on }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
```

- [ ] **Step 2: Mount SocketProvider in `src/main.jsx`**

Open `src/main.jsx` and wrap the app with `SocketProvider` inside `AuthProvider`:

```jsx
import { SocketProvider } from '@/contexts/SocketContext'
// ...
<AuthProvider>
  <SocketProvider>
    <App />
  </SocketProvider>
</AuthProvider>
```

- [ ] **Step 3: Subscribe to file events in DashboardPage**

At the top of `DashboardPage.jsx`, import:

```js
import { useSocket } from '@/contexts/SocketContext'
```

Inside the component, after the fetch `useEffect`, add:

```js
const { on } = useSocket()

useEffect(() => {
  const offCreated = on('file:created', () => {
    api.get('/api/files').then(data => setAllFiles(data.files)).catch(() => {})
  })
  const offUpdated = on('file:updated', ({ id }) => {
    api.get('/api/files').then(data => setAllFiles(data.files)).catch(() => {})
  })
  const offDeleted = on('file:deleted', ({ id }) => {
    setAllFiles(prev => prev.filter(f => f.id !== id))
  })
  const offLockAcquired = on('lock:acquired', ({ path, holder }) => {
    setAllFiles(prev => prev.map(f => f.path === path ? { ...f, lock: holder } : f))
  })
  const offLockReleased = on('lock:released', ({ path }) => {
    setAllFiles(prev => prev.map(f => f.path === path ? { ...f, lock: null } : f))
  })
  return () => {
    offCreated(); offUpdated(); offDeleted(); offLockAcquired(); offLockReleased()
  }
}, [on])
```

- [ ] **Step 4: Manual test**

Run `npm run dev`, log in. Open devtools Network → WS — you should see a `socket.io` connection (101 Switching Protocols).

In a second terminal, manually lock a file via curl and confirm the dashboard receives the event (the file's lock badge will update — badge component comes in Task 17).

---

## Task 17: LockBadge + PresenceIndicator + dashboard visual integration

**Files:**
- Create: `src/components/LockBadge.jsx`
- Create: `src/components/PresenceIndicator.jsx`
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Write `src/components/LockBadge.jsx`**

```jsx
export default function LockBadge({ holder, className = '' }) {
  if (!holder) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 ${className}`}
      title={`Düzenleniyor: ${holder.displayName}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
      </span>
      {holder.displayName} düzenliyor
    </span>
  )
}
```

- [ ] **Step 2: Write `src/components/PresenceIndicator.jsx`**

```jsx
export default function PresenceIndicator({ users }) {
  if (!users || users.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.slice(0, 4).map(u => (
          <div
            key={u.id}
            title={u.displayName}
            className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-semibold ring-2 ring-background"
          >
            {u.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {users.length} online
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Use them in DashboardPage**

At the top of `DashboardPage.jsx`, add:

```js
import LockBadge from '@/components/LockBadge'
import PresenceIndicator from '@/components/PresenceIndicator'
```

In the header section (where the user avatar is), add the presence indicator before the divider:

```jsx
<PresenceIndicator users={presence} />
<div className="w-px h-4 bg-border" />
```

And add `const { presence } = useSocket()` near the top of the component (or extend the existing `on` destructure).

In `FileTable`, inside the `<TableRow>`, after the title `<TableCell>`, add a lock badge cell. Or more easily, render it inside the title cell:

```jsx
<TableCell>
  <div className="flex items-center gap-2">
    <div>
      <p className="font-medium group-hover:text-foreground transition-colors">{file.title}</p>
      <p className="text-xs text-muted-foreground">{file.fileName}</p>
    </div>
    {file.lock && <LockBadge holder={file.lock} />}
  </div>
</TableCell>
```

- [ ] **Step 4: Manual test**

Run dev. Use curl to acquire a lock on any file. The dashboard should show a pulsing "X düzenliyor" badge next to the file's title within a second.
Release the lock — badge disappears.

---

## Task 18: FilePage view mode + MarkdownPreview + shadcn additions

**Files:**
- Create: `src/components/MarkdownPreview.jsx`
- Create: `src/pages/FilePage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Install shadcn components**

shadcn components for this project are manually copied. Create these files if they don't exist:

Create `src/components/ui/sonner.jsx`:

```jsx
import { Toaster as Sonner } from 'sonner'

export function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}
```

Add Toaster to `src/main.jsx` inside the provider tree, next to `<App />`:

```jsx
import { Toaster } from '@/components/ui/sonner'
// ...
<SocketProvider>
  <App />
  <Toaster position="bottom-right" />
</SocketProvider>
```

- [ ] **Step 2: Write `src/components/MarkdownPreview.jsx`**

```jsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownPreview({ content, className = '' }) {
  return (
    <div className={`prose prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-muted prose-code:text-foreground ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 3: Enable @tailwindcss/typography**

Open `src/index.css` and add after the existing Tailwind directives:

```css
@plugin "@tailwindcss/typography";
```

(Tailwind v4 uses `@plugin` directive in CSS, not a config file.)

- [ ] **Step 4: Write `src/pages/FilePage.jsx` (view mode first)**

```jsx
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MarkdownPreview from '@/components/MarkdownPreview'
import LockBadge from '@/components/LockBadge'

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2 }

export default function FilePage({ mode = 'view' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { on } = useSocket()

  const [file, setFile] = useState(null)
  const [lock, setLock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get(`/api/files/${id}`)
      setFile(data.file)
      setLock(data.lock)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Realtime updates for this file
  useEffect(() => {
    const offUpdated = on('file:updated', ({ id: updatedId }) => {
      if (updatedId === id) load()
    })
    const offLockAcquired = on('lock:acquired', ({ id: lid, holder }) => {
      if (lid === id) setLock(holder)
    })
    const offLockReleased = on('lock:released', ({ id: lid }) => {
      if (lid === id) setLock(null)
    })
    const offDeleted = on('file:deleted', ({ id: did }) => {
      if (did === id) {
        toast.error('Bu dosya silindi')
        navigate('/')
      }
    })
    return () => { offUpdated(); offLockAcquired(); offLockReleased(); offDeleted() }
  }, [id, on, load, navigate])

  const canEdit = user && ROLE_ORDER[user.role] >= ROLE_ORDER.editor
  const canDelete = user?.role === 'admin'
  const lockedByOther = lock && lock.userId !== user?.id

  const handleEdit = async () => {
    try {
      await api.post(`/api/files/${id}/lock`)
      navigate(`/file/${id}/edit`)
    } catch (e) {
      if (e.status === 409) {
        toast.error(`Dosya şu an ${e.data?.holder?.displayName || 'başka bir kullanıcı'} tarafından düzenleniyor`)
      } else {
        toast.error(e.message)
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${file.title}" dosyasını silmek istediğine emin misin?`)) return
    try {
      await api.del(`/api/files/${id}`)
      toast.success('Dosya silindi')
      navigate('/')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Yükleniyor...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-sm text-destructive">{error}</div>
  if (!file) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Geri
            </Link>
            <div className="w-px h-4 bg-border" />
            <span className="font-semibold truncate max-w-md">{file.title}</span>
            <Badge variant="secondary" className="font-normal">{file.category}</Badge>
            {lock && <LockBadge holder={lock} />}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !lockedByOther && (
              <Button size="sm" onClick={handleEdit}>Düzenle</Button>
            )}
            {canDelete && !lockedByOther && (
              <Button size="sm" variant="destructive" onClick={handleDelete}>Sil</Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="mb-6 text-xs text-muted-foreground flex items-center gap-3">
          <span>{file.fileName}</span>
          <span>•</span>
          <span>{file.date}</span>
        </div>
        <MarkdownPreview content={file.body} />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Add route in `src/App.jsx`**

```jsx
import FilePage from '@/pages/FilePage'
// ...
<Route
  path="/file/:id"
  element={
    <ProtectedRoute>
      <FilePage mode="view" />
    </ProtectedRoute>
  }
/>
<Route
  path="/file/:id/edit"
  element={
    <ProtectedRoute minRole="editor">
      <FilePage mode="edit" />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 6: Manual test**

Run `npm run dev`, log in, click a file. The file opens in view mode with rendered markdown, a "Düzenle" button (if you're editor/admin), "Sil" (if admin). Click "Düzenle" — a lock is acquired, URL changes to `/file/:id/edit`, but the page doesn't visually switch yet (both modes still render the same component). That's normal — next task adds edit UI.

---

## Task 19: FilePage edit mode + MarkdownEditor (CodeMirror)

**Files:**
- Create: `src/components/MarkdownEditor.jsx`
- Modify: `src/pages/FilePage.jsx`

- [ ] **Step 1: Write `src/components/MarkdownEditor.jsx`**

```jsx
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    padding: '16px',
  },
  '.cm-scroller': { fontFamily: 'inherit' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid var(--border)',
  },
})

export default function MarkdownEditor({ value, onChange, className = '' }) {
  return (
    <div className={`rounded-lg border border-border bg-muted/20 overflow-hidden ${className}`}>
      <CodeMirror
        value={value}
        onChange={onChange}
        height="100%"
        theme={oneDark}
        extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Extend `src/pages/FilePage.jsx` with edit mode**

Inside `FilePage.jsx`, add state and effects for edit mode. Near the other `useState` calls:

```js
const [editedContent, setEditedContent] = useState('')
const [saving, setSaving] = useState(false)
const isEditMode = mode === 'edit'
```

After the `load` useEffect, add a heartbeat + cleanup effect for edit mode:

```js
// When file loaded, initialize editor content (edit mode only)
useEffect(() => {
  if (isEditMode && file) setEditedContent(file.content)
}, [isEditMode, file])

// Heartbeat + release lock on unmount (edit mode only)
useEffect(() => {
  if (!isEditMode || !id) return
  const interval = setInterval(() => {
    api.post(`/api/files/${id}/lock/heartbeat`).catch(err => {
      if (err.status === 409) {
        toast.error('Kilit kayboldu (timeout). Görüntüleme moduna dönülüyor.')
        navigate(`/file/${id}`)
      }
    })
  }, 30_000)

  const release = () => {
    navigator.sendBeacon?.(`/api/files/${id}/lock`, '') ||
      api.del(`/api/files/${id}/lock`).catch(() => {})
  }
  const onBeforeUnload = () => release()
  window.addEventListener('beforeunload', onBeforeUnload)

  return () => {
    clearInterval(interval)
    window.removeEventListener('beforeunload', onBeforeUnload)
    api.del(`/api/files/${id}/lock`).catch(() => {})
  }
}, [isEditMode, id, navigate])
```

Add save/cancel handlers:

```js
const handleSave = async () => {
  try {
    setSaving(true)
    const data = await api.put(`/api/files/${id}`, { content: editedContent })
    setFile(data.file)
    setEditedContent(data.file.content)
    toast.success('Kaydedildi')
  } catch (e) {
    toast.error(e.message)
  } finally {
    setSaving(false)
  }
}

const handleCancel = () => {
  navigate(`/file/${id}`)
}
```

Replace the `<main>` block with a conditional that renders either view or edit mode:

```jsx
{!isEditMode ? (
  <main className="container mx-auto px-6 py-10 max-w-4xl">
    <div className="mb-6 text-xs text-muted-foreground flex items-center gap-3">
      <span>{file.fileName}</span>
      <span>•</span>
      <span>{file.date}</span>
    </div>
    <MarkdownPreview content={file.body} />
  </main>
) : (
  <main className="container mx-auto px-6 py-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-8rem)]">
      <MarkdownEditor
        value={editedContent}
        onChange={setEditedContent}
        className="h-full overflow-auto"
      />
      <div className="rounded-lg border border-border p-6 overflow-auto">
        <MarkdownPreview content={parseBody(editedContent)} />
      </div>
    </div>
  </main>
)}
```

Add a tiny helper at the top of the file (outside the component) to strip frontmatter for the preview:

```js
function parseBody(raw) {
  if (!raw) return ''
  const lines = raw.split('\n')
  let i = 0
  while (i < lines.length) {
    if (/^<!--\s*\w+:\s*.+\s*-->$/.test(lines[i])) i++
    else if (lines[i].trim() === '' && i < 5) i++
    else break
  }
  return lines.slice(i).join('\n')
}
```

Update the header action buttons so edit mode shows Save/Cancel instead of Edit:

```jsx
<div className="flex items-center gap-2">
  {!isEditMode && canEdit && !lockedByOther && (
    <Button size="sm" onClick={handleEdit}>Düzenle</Button>
  )}
  {!isEditMode && canDelete && !lockedByOther && (
    <Button size="sm" variant="destructive" onClick={handleDelete}>Sil</Button>
  )}
  {isEditMode && (
    <>
      <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
        Vazgeç
      </Button>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </>
  )}
</div>
```

Import `MarkdownEditor` at the top:

```js
import MarkdownEditor from '@/components/MarkdownEditor'
```

- [ ] **Step 3: Manual test**

Run dev. Open a file, click Düzenle. You should see:
- CodeMirror on the left with the file's raw content (frontmatter + body)
- Live preview on the right as you type
- Kaydet / Vazgeç buttons at top

Type something, click Kaydet. Open the actual `.md` file in another editor — you should see the `<!-- düzenleyen: X — DD/MM/YYYY HH:mm -->` comment injected above the changed line.

Click Vazgeç — lock releases, view mode returns. Open the file from another terminal/browser — Düzenle button is available again.

---

## Task 20: New file + delete + final polish

**Files:**
- Create: `src/components/NewFileDialog.jsx`
- Create: shadcn `dialog.jsx`, `label.jsx`, `select.jsx` (minimal versions)
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Create `src/components/ui/dialog.jsx`**

Use the standard shadcn dialog component. From the shadcn/ui docs (https://ui.shadcn.com/docs/components/dialog), copy the current "dialog" source. Or use this minimal version:

```jsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))

export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5', className)} {...props} />
)

export const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex justify-end gap-2', className)} {...props} />
)

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
```

You may need to install `lucide-react`:

```bash
npm install lucide-react
```

- [ ] **Step 2: Create `src/components/NewFileDialog.jsx`**

```jsx
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'

const CATEGORIES = ['notes', 'guides', 'logs', 'ideas']

export default function NewFileDialog({ onCreated, children }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('notes')
  const [title, setTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    const finalName = fileName.trim() || (title.trim().toLowerCase().replace(/\s+/g, '-') + '.md')
    if (!finalName.endsWith('.md')) {
      toast.error('Dosya adı .md ile bitmeli')
      return
    }
    try {
      setSaving(true)
      const res = await api.post('/api/files', {
        category,
        fileName: finalName,
        title: title.trim(),
      })
      toast.success('Dosya oluşturuldu')
      setOpen(false)
      setTitle(''); setFileName('')
      onCreated?.(res)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni dosya</DialogTitle>
          <DialogDescription>Yeni bir markdown dosyası oluştur.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Kategori</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Başlık</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Dosya başlığı" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Dosya adı (opsiyonel)</label>
            <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="not-001.md" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Oluşturuluyor...' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Add the New File button to DashboardPage header**

Import:

```js
import NewFileDialog from '@/components/NewFileDialog'
```

In the header, next to the presence indicator, add (only for editor/admin):

```jsx
{user?.role !== 'viewer' && (
  <NewFileDialog onCreated={() => api.get('/api/files').then(d => setAllFiles(d.files))}>
    <Button size="sm" variant="outline">+ Yeni</Button>
  </NewFileDialog>
)}
```

- [ ] **Step 4: Manual test**

Run dev. Log in as editor or admin. Click "+ Yeni", fill the dialog, create a file. It appears in the table immediately. Click it → view → düzenle → yaz → kaydet. The annotation comment shows up in the raw file.

As admin, open a file → Sil → confirm → file disappears from dashboard (also on any other open tab, via realtime).

---

## Task 21: Final end-to-end manual smoke test

This task is pure validation — no code changes.

- [ ] **Step 1: Create a second user**

```bash
npm run create-user
```

Create a user `test2` with role `editor`.

- [ ] **Step 2: Start dev mode**

```bash
npm run dev
```

- [ ] **Step 3: Two-browser concurrent test**

- Open Chrome → `http://localhost:5173` → log in as your admin user.
- Open Firefox (or Chrome incognito) → same URL → log in as `test2`.

**Verify:**

- [ ] Both dashboards load the same file list.
- [ ] Presence indicator in the top-right shows "2 online" on both.
- [ ] Admin clicks a file → Düzenle. The Firefox tab's file row immediately shows a pulsing "🔒 Admin düzenliyor" badge. Admin's Düzenle button is still visible in their own browser.
- [ ] In Firefox, clicking that same file → Düzenle button disabled / clicking it shows toast "dosya şu an Admin tarafından düzenleniyor".
- [ ] Admin edits the file, clicks Kaydet. If Firefox had the file open in view mode, its content updates automatically (via `file:updated` → re-fetch).
- [ ] Admin clicks Vazgeç → lock releases → Firefox sees the badge disappear and can click Düzenle.
- [ ] Firefox as editor edits the same file. Opens the `.md` file in a code editor — sees two annotation comments stacked (admin's old + editor's new), newest on top.
- [ ] Admin creates a new file via NewFileDialog → appears in Firefox's dashboard instantly.
- [ ] Admin deletes a file → disappears from both.
- [ ] Admin closes the browser while in edit mode → wait 2+ minutes (stale sweep) → Firefox can now edit the file.

- [ ] **Step 4: Production build test**

Stop dev mode. Run:

```bash
npm run build
NODE_ENV=production node server/index.js
```

Visit `http://localhost:3001`. The SPA should serve from the Node process. Log in, navigate, confirm everything works end-to-end on a single port.

- [ ] **Step 5: Report any issues back to the user**

Do not attempt to commit. Hand off to the user for their own testing pass before any git operation.

---

## Self-review checklist (post-plan)

**Spec coverage:**
- ✅ Auth + JWT + bcrypt — Tasks 5, 7
- ✅ Roles (viewer/editor/admin) — Tasks 5, 7, 10
- ✅ User CLI — Task 6
- ✅ File store + frontmatter — Tasks 3, 8
- ✅ Diff annotator with merge rule — Task 4
- ✅ Lock manager + stale sweep + persistence — Tasks 9, 10
- ✅ Files API + lock endpoints — Task 10
- ✅ Realtime (Socket.IO + all 6 events) — Tasks 10, 11, 16
- ✅ Vite proxy + prod single-port — Tasks 2, 12
- ✅ Frontend auth migration — Task 14
- ✅ Dashboard with realtime badges + presence — Tasks 15, 16, 17
- ✅ FilePage view + edit modes — Tasks 18, 19
- ✅ CodeMirror editor + live preview — Task 19
- ✅ New file + delete flows — Task 20
- ✅ End-to-end verification — Task 21

**Placeholder scan:** No TBDs, no "similar to task N", every code step has complete code.

**Type consistency:** `annotate(oldText, newText, user, date)` signature used consistently. `locks.acquire/release/heartbeat` signatures match between lockManager, tests, and routes. `broadcast(event, payload)` signature consistent between realtime.js and routes/files.js.

**Scope:** Single coherent feature. Not decomposable further without breaking the vertical slice.
