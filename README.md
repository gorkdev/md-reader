# MD Reader

A multi-user collaborative markdown file manager with real-time editing, file locking, blame tracking, and edit history.

## Features

- **WYSIWYG Markdown Editor** — Rich text editing powered by MDXEditor with toolbar, shortcuts, and live preview
- **Multi-User Collaboration** — Role-based access control (viewer, editor, admin) with real-time presence indicators
- **File Locking** — Pessimistic locking with heartbeat to prevent edit conflicts
- **Blame Tracking** — Per-line blame data showing who edited what and when (GitLens-style in editor)
- **Edit History** — Detailed change history with diff view, date filtering, and line-level change tracking
- **Dark/Light Theme** — Smooth animated theme switching with system preference detection and localStorage persistence
- **Real-Time Updates** — Socket.IO powered live updates for file changes, locks, and user presence
- **Search & Categories** — Filter files by category (notes, guides, logs, ideas) and search by title

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS 4, shadcn/ui, MDXEditor, Socket.IO Client, Lucide Icons

**Backend:** Express 5, Socket.IO, JWT Authentication, bcrypt, JSON file-based storage

## Setup

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone <repo-url>
cd md-reader
npm install
```

### Environment

Copy the example env file and set your JWT secret:

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3001
JWT_SECRET=your-secret-key-minimum-32-characters-long
NODE_ENV=development
```

### Create Admin User

```bash
npm run create-user
```

Follow the prompts to create the first admin user.

### Run Development Server

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API server (port 3001) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm start
```

The production server serves both the API and the built frontend on port 3001.

## Project Structure

```
md-reader/
├── content/          # Markdown files organized by category
│   ├── notes/
│   ├── guides/
│   ├── logs/
│   └── ideas/
├── data/             # Runtime data (gitignored)
│   ├── users.json
│   ├── locks.json
│   ├── blame/
│   └── history/
├── server/           # Express backend
│   ├── routes/       # API routes (auth, files, users)
│   ├── services/     # Business logic (fileStore, lockManager, blameStore, historyStore)
│   ├── middleware/    # Auth & role middleware
│   ├── utils/        # Helpers (paths, frontmatter, userColor, writeQueue)
│   └── realtime.js   # Socket.IO setup
├── src/              # React frontend
│   ├── pages/        # LoginPage, DashboardPage, FilePage
│   ├── components/   # UI components
│   ├── contexts/     # Auth, Socket, Theme providers
│   └── lib/          # Utilities (api, utils, timeAgo)
└── package.json
```

## User Roles

| Role | Permissions |
|------|-------------|
| **viewer** | Read-only access to all files |
| **editor** | Read + create + edit files |
| **admin** | Full access + delete files + manage users |

## License

MIT
