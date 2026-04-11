import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { useTheme } from '@/contexts/ThemeContext'
import { api } from '@/lib/api'
import LockBadge from '@/components/LockBadge'
import PresenceIndicator from '@/components/PresenceIndicator'
import NewFileDialog from '@/components/NewFileDialog'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const EASE = 'cubic-bezier(0.16,1,0.3,1)'
const EXIT_DURATION = 280

const CATEGORY_LABELS = {
  notes: 'Notes',
  guides: 'Guides',
  logs: 'Logs',
  ideas: 'Ideas',
}

function filterBySearch(files, search) {
  if (!search) return files
  const q = search.toLowerCase()
  return files.filter(f =>
    f.title.toLowerCase().includes(q) ||
    f.fileName.toLowerCase().includes(q)
  )
}

function FileTable({ files, onRowClick, currentUserId }) {
  if (files.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        No files found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Title</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Category</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Date</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium text-right">Words</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file, i) => (
          <TableRow
            key={file.id}
            className="cursor-pointer group"
            onClick={() => onRowClick?.(file)}
            style={{
              animation: 'tableRowIn 0.3s ease-out both',
              animationDelay: `${i * 30}ms`,
            }}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-medium group-hover:text-foreground transition-colors">{file.title}</p>
                  <p className="text-xs text-muted-foreground">{file.fileName}</p>
                </div>
                {file.lock && file.lock.userId !== currentUserId && <LockBadge holder={file.lock} />}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {CATEGORY_LABELS[file.category] || file.category}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums text-sm">
              {file.date}
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
              {file.wordCount.toLocaleString('en-US')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { on, presence } = useSocket()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [allFiles, setAllFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const pendingNav = useRef(null)

  const animatedNavigate = useCallback((to) => {
    if (exiting) return
    pendingNav.current = to
    setExiting(true)
  }, [exiting])

  useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => {
      if (pendingNav.current) navigate(pendingNav.current)
    }, EXIT_DURATION)
    return () => clearTimeout(timer)
  }, [exiting, navigate])

  const refresh = () => {
    api.get('/api/files').then(data => setAllFiles(data.files)).catch(() => {})
  }

  useEffect(() => {
    let active = true
    api.get('/api/files')
      .then(data => { if (active) setAllFiles(data.files) })
      .catch(() => {})
      .finally(() => { if (active) setLoadingFiles(false) })
    return () => { active = false }
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    const offCreated = on('file:created', refresh)
    const offUpdated = on('file:updated', refresh)
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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const categories = useMemo(() => {
    return [...new Set(allFiles.map(f => f.category))]
  }, [allFiles])

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'

  const show = mounted && !exiting

  const dashAnim = (delay = 0) => ({
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0) scale(1)' : (exiting ? 'translateY(-8px) scale(0.995)' : 'translateY(8px) scale(1)'),
    transition: exiting
      ? `opacity ${EXIT_DURATION}ms ${EASE}, transform ${EXIT_DURATION}ms ${EASE}`
      : `opacity 700ms ease-out ${delay}ms, transform 700ms ease-out ${delay}ms`,
  })

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b z-10 bg-background/95 backdrop-blur-sm shrink-0">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold">MD Reader</span>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <CreateUserDialog>
                <Button size="sm" variant="outline">+ Kullanıcı</Button>
              </CreateUserDialog>
            )}
            {user?.role && user.role !== 'viewer' && (
              <NewFileDialog onCreated={refresh}>
                <Button size="sm" variant="outline">+ Yeni</Button>
              </NewFileDialog>
            )}
            <PresenceIndicator users={presence} />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                {initial}
              </div>
              <span className="text-sm font-medium">{user?.displayName || user?.username}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <Button size="xs" variant="destructive" onClick={() => setLogoutOpen(true)}>
              Çıkış Yap
            </Button>

            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle>Çıkış Yap</DialogTitle>
                  <DialogDescription>
                    Oturumunuz sonlandırılacak. Devam etmek istiyor musunuz?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button size="sm" variant="outline" onClick={() => setLogoutOpen(false)}>
                    Vazgeç
                  </Button>
                  <Button size="sm" variant="destructive" onClick={logout}>
                    Çıkış Yap
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Title */}
        <div className="mb-6 shrink-0" style={dashAnim(0)}>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Files</h1>
          <p className="text-sm text-muted-foreground">
            {loadingFiles ? 'Yükleniyor...' : `${allFiles.length} markdown files across ${categories.length} categories`}
          </p>
        </div>

        {/* Controls + Table */}
        <Tabs defaultValue="all" className="w-full flex-1 min-h-0 flex flex-col">
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            style={dashAnim(80)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-lg flex-1 min-h-0 overflow-auto" style={dashAnim(160)}>
            <TabsContent value="all" className="m-0">
              <FileTable files={filterBySearch(allFiles, search)} onRowClick={file => animatedNavigate(`/file/${file.id}`)} currentUserId={user?.id} />
            </TabsContent>
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="m-0">
                <FileTable
                  files={filterBySearch(allFiles.filter(f => f.category === cat), search)}
                  onRowClick={file => animatedNavigate(`/file/${file.id}`)}
                  currentUserId={user?.id}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>
    </div>
  )
}
