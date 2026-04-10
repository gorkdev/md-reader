# MD Reader — Multi-User Collaborative Markdown Editing

**Date:** 2026-04-09
**Status:** Approved (awaiting implementation)

## Goal

Enable multiple authenticated users to view and edit shared markdown files in the MD Reader app. When a user edits a file, automatically annotate changed line blocks with a comment indicating who edited them and when. Prevent conflicts via pessimistic locking. Propagate lock state and file changes to all connected clients in real time.

## Non-goals (explicit YAGNI)

- Collaborative concurrent editing (CRDT / OT / Google Docs style)
- Viewer tracking ("X users currently viewing this file")
- Web-based user management UI (first iteration uses CLI only)
- File rename, folder management, file history/versioning UI
- Image upload / attachment support in the editor
- Mobile-first editing UX (mobile works but is not the primary target)

## Stack

- **Backend:** Node.js + Express + Socket.IO
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt`
- **Editor:** CodeMirror 6 via `@uiw/react-codemirror` + `@codemirror/lang-markdown`
- **Preview:** `react-markdown` + `remark-gfm` + `@tailwindcss/typography`
- **Notifications:** `sonner` toast (shadcn-recommended)
- **Realtime:** Socket.IO (auto-reconnect, single namespace)
- **Diff:** `diff` npm package (line-level LCS)
- **Dev orchestration:** `concurrently` (Vite + Node backend)

## Project structure

```
md-reader/
├── server/
│   ├── index.js              # Express + Socket.IO bootstrap, single port
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/login, GET /api/auth/me
│   │   ├── files.js          # CRUD + lock endpoints
│   │   └── users.js          # admin listing (future UI)
│   ├── middleware/
│   │   ├── auth.js           # JWT verification, attaches req.user
│   │   └── role.js           # requireRole('editor' | 'admin')
│   ├── services/
│   │   ├── fileStore.js      # content/ read/write + frontmatter parser
│   │   ├── lockManager.js    # data/locks.json, heartbeat, stale cleanup
│   │   ├── userStore.js      # data/users.json
│   │   └── diffAnnotator.js  # line diff + comment injection
│   └── realtime.js           # Socket.IO event definitions + emitters
├── scripts/
│   └── create-user.js        # interactive CLI: username, displayName, password, role
├── data/
│   ├── users.json            # persisted users
│   └── locks.json            # persisted locks (survives restart)
├── content/                  # existing markdown files, unchanged
├── src/                      # React frontend
│   ├── contexts/
│   │   ├── AuthContext.jsx   # existing, migrated to JWT
│   │   └── SocketContext.jsx # NEW — Socket.IO client + event bus
│   ├── pages/
│   │   ├── LoginPage.jsx     # existing, now hits API
│   │   ├── DashboardPage.jsx # existing, API + realtime integration
│   │   └── FilePage.jsx      # NEW — view/edit single file
│   ├── components/
│   │   ├── MarkdownEditor.jsx    # CodeMirror wrapper with shadcn theme
│   │   ├── MarkdownPreview.jsx   # react-markdown + prose styling
│   │   ├── LockBadge.jsx         # pulsing "🔒 {displayName} editing"
│   │   ├── PresenceIndicator.jsx # online users (top-right)
│   │   ├── ConfirmDialog.jsx     # shadcn AlertDialog wrapper
│   │   └── ui/                   # existing shadcn + new: alert-dialog, dropdown-menu, sonner
│   └── lib/
│       ├── api.js            # fetch wrapper (JWT header, 401 handling)
│       └── dateFormat.js     # "DD/MM/YYYY HH:mm" formatter
├── vite.config.js            # proxy /api and /socket.io to :3001
├── .env.example              # PORT, JWT_SECRET
└── package.json              # "dev": concurrently, "start": node server
```

## Data models

### `data/users.json`

```json
[
  {
    "id": "u_abc123",
    "username": "gorkem",
    "displayName": "Gorkem",
    "passwordHash": "$2b$10$...",
    "role": "admin",
    "createdAt": "2026-04-09T14:30:00.000Z"
  }
]
```

- `id`: opaque random id (nanoid or crypto.randomUUID)
- `username`: unique, used for login
- `displayName`: shown in UI and in edit annotations
- `passwordHash`: bcrypt hash (cost 10)
- `role`: `"viewer"` | `"editor"` | `"admin"`

### `data/locks.json`

```json
{
  "content/notes/example.md": {
    "userId": "u_abc123",
    "username": "gorkem",
    "displayName": "Gorkem",
    "acquiredAt": "2026-04-09T14:30:00.000Z",
    "lastHeartbeat": "2026-04-09T14:35:00.000Z"
  }
}
```

- Key: relative path from project root (e.g., `content/notes/x.md`)
- Persisted across restarts; stale entries are cleaned on startup

## Roles and permissions

| Action | viewer | editor | admin |
|---|---|---|---|
| List files | ✓ | ✓ | ✓ |
| Read file content | ✓ | ✓ | ✓ |
| Acquire edit lock | ✗ | ✓ | ✓ |
| Save edits | ✗ | ✓ | ✓ |
| Create new file | ✗ | ✓ | ✓ |
| Delete file | ✗ | ✗ | ✓ |
| Manage users (future UI) | ✗ | ✗ | ✓ |

## REST API

All endpoints except `/api/auth/login` require `Authorization: Bearer <token>` header.

| Method | Path | Min role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{username, password}` → `{token, user}` |
| GET | `/api/auth/me` | auth | Current user from token |
| GET | `/api/files` | auth | List all files with meta + current lock state |
| GET | `/api/files/:id` | auth | Single file content + meta + lock state |
| POST | `/api/files/:id/lock` | editor | Acquire lock; returns 409 with lock holder if busy |
| POST | `/api/files/:id/lock/heartbeat` | editor | Refresh `lastHeartbeat` (lock owner only) |
| DELETE | `/api/files/:id/lock` | editor | Release own lock |
| PUT | `/api/files/:id` | editor | Save content (must own lock) |
| POST | `/api/files` | editor | Create new file (body: `{category, fileName, title, content}`) |
| DELETE | `/api/files/:id` | admin | Delete file (lock must be free or owned by requester) |
| GET | `/api/users` | admin | List users (future UI) |

- `:id` is the base64url-encoded relative path (e.g., `Y29udGVudC9ub3Rlcy94Lm1k`)
- Path traversal protection: decode → `path.resolve()` → assert resulting path is inside the `content/` root
- JWT expiry: 7 days; stored in browser localStorage as `md-reader-token`
- 401 from any endpoint → frontend clears token and redirects to `/login`

## Lock mechanics (pessimistic)

1. User clicks "Düzenle" → client sends `POST /api/files/:id/lock`.
2. Server checks `locks.json`:
   - If empty → writes lock entry, emits `lock:acquired` Socket.IO event to all clients, returns 200 with lock info.
   - If held by another user → returns 409 with `{holder: {displayName, acquiredAt}}`.
   - If held by the same user (reconnect scenario) → refreshes heartbeat, returns 200.
3. Client enters edit mode and starts a heartbeat timer: `POST /api/files/:id/lock/heartbeat` every **30 seconds**.
4. Server runs a **stale lock sweep every 30 seconds**: any lock with `lastHeartbeat` older than **2 minutes** is removed and `lock:released` is emitted.
5. Client cleanup:
   - React `useEffect` cleanup → `DELETE /api/files/:id/lock`
   - `window.beforeunload` → `navigator.sendBeacon` to same endpoint as fallback
6. "Save" does **not** release the lock — only explicit "Done/Cancel" or navigation away does. This lets the user save multiple times during a session.
7. On server startup: `locks.json` is loaded, stale sweep runs immediately.

## Diff + annotation logic

When the server receives `PUT /api/files/:id`:

1. Read existing file content from disk → `oldContent`.
2. Parse frontmatter (existing `parseFrontmatter` logic, ported to server). Frontmatter is a **protected region**: no annotations are inserted into or above frontmatter lines.
3. Run line-level diff (`diff.diffLines(oldBody, newBody)`).
4. Identify **contiguous blocks** of added/changed lines. Each block receives **one** annotation comment on the line immediately above the first changed line of the block.
5. Annotation format:
   ```
   <!-- düzenleyen: {displayName} — DD/MM/YYYY HH:mm -->
   ```
   Example: `<!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->`
6. **Merge rule:** If the line immediately above a changed block already contains an annotation for the **same user**, update only the timestamp (replace in place). If it's a **different user's** annotation, prepend a new annotation line above the existing one, so history accumulates:
   ```
   <!-- düzenleyen: Gorkem — 09/04/2026 14:30 -->
   <!-- düzenleyen: Ayşe — 08/04/2026 10:15 -->
   {changed line}
   ```
7. Deleted lines receive no annotation (the line is gone; any annotation that was attached to it is removed with it).
8. Write the annotated content to disk.
9. Emit `file:updated` with `{id, meta, updatedBy, updatedAt}` to all clients.
10. Return the new content to the saving client.

**Date formatting:** `DD/MM/YYYY HH:mm` using server local time. Zero-padded day/month/hour/minute.

**Diff library choice:** `diff` npm package (tiny, stable, no native deps). `diffLines` returns an array of `{value, added, removed, count}` chunks — straightforward to walk and rebuild the annotated output.

## Frontend routing

| Path | Component | Auth | Description |
|---|---|---|---|
| `/login` | LoginPage | public | Existing, POSTs to `/api/auth/login` |
| `/` | DashboardPage | protected | File list, realtime badges, filters |
| `/file/:id` | FilePage (view mode) | protected | Markdown rendered + meta + action buttons |
| `/file/:id/edit` | FilePage (edit mode) | protected, editor+ | CodeMirror + live preview |

`:id` is the base64url-encoded path (matches backend).

## Dashboard behavior

- Clicking any row navigates to `/file/:id` (view mode).
- Each row shows a `LockBadge` on the right when a lock exists.
- `PresenceIndicator` in the top bar shows online users (small avatars with displayName tooltip).
- `SocketContext` subscribes to: `file:created`, `file:updated`, `file:deleted`, `lock:acquired`, `lock:released`, `presence:update`. State updates are reflected immediately in the table and indicators.
- Existing tabs (All/Notes/Guides/Logs/Ideas), search, staggered animations are preserved.
- Admin sees an additional "New File" button; editors see it too; viewers do not.

## FilePage (view mode)

- Layout: shadcn Card with:
  - Header: title, category badge, meta (last edited by, date)
  - Body: `MarkdownPreview`
- Action buttons (top-right, conditional):
  - **"Düzenle"** (role ≥ editor, no lock) → calls `POST /lock`; on 200 navigates to `/file/:id/edit`; on 409 shows a toast with the holder's name.
  - **"Sil"** (admin only) → `ConfirmDialog` → `DELETE /api/files/:id` → navigate to `/`.
- If someone else holds a lock: a `LockBadge` is shown inline, "Düzenle" button is disabled with a tooltip.

## FilePage (edit mode)

- Split layout: `MarkdownEditor` (left) + `MarkdownPreview` (right). Mobile: tab switcher.
- Top bar: "Kaydet" (primary) and "Vazgeç" (outline) buttons.
- Heartbeat timer runs silently in the background.
- "Kaydet": `PUT /api/files/:id` with current content → toast "Kaydedildi" → stays in edit mode (lock still held). Editor content is replaced with server response (so user sees the injected annotations immediately).
- "Vazgeç": releases lock, navigates back to view mode without saving.
- `useEffect` cleanup + `beforeunload` ensure lock is released even on browser close or navigation.
- If the server responds 403 "You do not hold the lock" (e.g., stale lock was swept), show a toast and route back to view mode.

## Styling & animation

- Preserves the existing dark theme and staggered entry animation pattern.
- CodeMirror theme derives colors from shadcn CSS variables (`--background`, `--foreground`, `--muted`, `--accent`) so it matches the rest of the app in both light and dark modes.
- `LockBadge` has a subtle pulsing dot animation.
- Toasts via `sonner`, positioned bottom-right.
- Preview uses Tailwind's `prose` class with theme-appropriate modifiers.

## Socket.IO events

| Event | Direction | Payload | When |
|---|---|---|---|
| `connect` | server ← client | (auth token via handshake) | Client connects, JWT validated |
| `presence:update` | server → client | `[{userId, displayName, role}]` | On connect/disconnect |
| `lock:acquired` | server → client | `{id, holder: {userId, displayName, acquiredAt}}` | Lock created |
| `lock:released` | server → client | `{id}` | Lock removed (manual or stale sweep) |
| `file:created` | server → client | `{id, meta}` | New file via POST /api/files |
| `file:updated` | server → client | `{id, meta, updatedBy, updatedAt}` | PUT /api/files/:id |
| `file:deleted` | server → client | `{id}` | DELETE /api/files/:id |

All events are broadcast to all authenticated clients. The server does not track per-file subscribers in this iteration (simpler, fine for 5 users).

## Security

- Passwords: bcrypt cost 10
- JWT: HS256, secret from `.env` (`JWT_SECRET`), 7-day expiry, stored in localStorage
- All `/api/*` routes (except login) require valid JWT via middleware
- Role checks in a dedicated middleware layer, per endpoint
- Socket.IO handshake validates JWT; connection rejected if invalid
- Path traversal: base64url decode → `path.resolve` → `startsWith(contentRoot)` assertion
- `react-markdown` renders with raw HTML disabled (default) to prevent XSS
- Rate limiting: not in this iteration (trusted 5-user team)

## Development and deployment

### Dev mode
- `npm run dev` runs `concurrently` with:
  - Vite dev server on `:5173`
  - Node backend on `:3001`
- Vite proxies `/api` and `/socket.io` to `:3001`
- Hot reload works for both frontend (Vite HMR) and backend (optional: `nodemon` — decision at implementation time; not critical)

### Production
- `npm run build` → Vite outputs `dist/`
- `npm start` → single Node.js process serves:
  - Static files from `dist/`
  - `/api/*` routes
  - `/socket.io` WebSocket endpoint
  - SPA fallback: any non-API, non-socket, non-file request returns `dist/index.html`
- Single port (from `PORT` env, default 3001)
- Hosting: any Node.js-capable platform. `.env` must define `JWT_SECRET` and `PORT`.

### First-user bootstrap
- `node scripts/create-user.js`
- Interactive prompts: username, display name, password (confirmed), role
- Validates uniqueness against `data/users.json`, hashes password with bcrypt, writes entry
- Can be run any time to add subsequent users (until the admin UI is built)

## Testing approach

- **Unit tests:** `diffAnnotator.js` (core correctness — annotation merge rule, frontmatter protection, multi-block changes), `lockManager.js` (acquire/release/stale sweep)
- **Integration tests:** API endpoints via supertest (auth flow, lock contention, save with diff)
- **Manual smoke test:** Two browsers logged in as different users — verify lock badge appears, second user cannot edit, stale lock expires, file updates propagate

Test framework decision deferred to implementation planning (likely `vitest` since Vite is already the build tool).

## Open questions for implementation planning

- Exact nanoid/uuid choice for user IDs (nanoid preferred)
- Whether to add `nodemon` for backend dev reloads (nice-to-have)
- Whether `beforeunload` + `sendBeacon` is reliable enough, or also needs a server-side "disconnected socket → release their locks" fallback
- Exact CodeMirror shadcn theme color mapping (design during implementation)

These are small decisions to resolve inline during implementation, not spec-level blockers.
