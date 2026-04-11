import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import MarkdownPreview from '@/components/MarkdownPreview'
import MarkdownEditor from '@/components/MarkdownEditor'
import LockBadge from '@/components/LockBadge'
import { Home, Sun, Moon } from 'lucide-react'
import { getUserColor } from '@/lib/utils'
import { timeAgo } from '@/lib/timeAgo'

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2 }

/**
 * Convert line-level blame to block-level blame.
 * Lexical treats each paragraph/heading/list as one block and doesn't
 * render blank separator lines. The blame array is per-line (including blanks),
 * so we need to group non-blank lines into blocks and pick the most recent
 * blame entry for each block.
 */
function toBlockBlame(cleanContent, lineBlame) {
  if (!cleanContent || !lineBlame || lineBlame.length === 0) return []
  const lines = cleanContent.split('\n')
  const blocks = []
  let blockEntries = []

  const flush = () => {
    if (blockEntries.length > 0) {
      blocks.push(pickLatest(blockEntries))
      blockEntries = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const entry = lineBlame[i] || null

    // Blank line = block separator
    if (line.trim() === '') {
      flush()
      continue
    }

    // Heading / thematic break = always its own block
    if (line.match(/^#{1,6}\s/) || line.match(/^(\*{3,}|-{3,}|_{3,})\s*$/)) {
      flush()
      if (entry) blockEntries.push(entry)
      flush()
      continue
    }

    // Regular content line — accumulate into current block
    if (entry) blockEntries.push(entry)
  }
  flush()
  return blocks
}

function pickLatest(entries) {
  if (entries.length === 0) return null
  let latest = entries[0]
  for (let i = 1; i < entries.length; i++) {
    if (entries[i] && (!latest || new Date(entries[i].date) > new Date(latest.date))) {
      latest = entries[i]
    }
  }
  return latest
}
const EASE = 'cubic-bezier(0.16,1,0.3,1)'
const DURATION = 420
const EXIT_DURATION = 280
const DATE_FILTERS = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: '7d', label: 'Son 7 gün' },
  { key: '30d', label: 'Son 30 gün' },
]

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function filterByDate(entries, filterKey) {
  const now = new Date()
  const todayStart = startOfDay(now)
  if (filterKey === 'today') {
    return entries.filter(e => new Date(e.date) >= todayStart)
  }
  if (filterKey === 'yesterday') {
    const yesterdayStart = new Date(todayStart - 86400000)
    return entries.filter(e => {
      const d = new Date(e.date)
      return d >= yesterdayStart && d < todayStart
    })
  }
  const ms = { '7d': 604800000, '30d': 2592000000 }[filterKey]
  if (ms) return entries.filter(e => new Date(e.date).getTime() >= Date.now() - ms)
  return entries
}

function DiffDetail({ changes, entry }) {
  const { theme } = useTheme()
  const [visible, setVisible] = useState(false)
  const meaningful = (changes || []).filter(c => c.line.trim() !== '')
  const color = entry ? getUserColor(entry.username || entry.displayName, theme) : null

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => { cancelAnimationFrame(raf); setVisible(false) }
  }, [changes])

  if (meaningful.length === 0) return null

  return (
    <div
      className="border-t border-border overflow-hidden"
      style={{
        maxHeight: visible ? '300px' : '0px',
        opacity: visible ? 1 : 0,
        transition: `max-height 350ms ${EASE}, opacity 300ms ${EASE}`,
      }}
    >
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Değişiklikler</span>
        {entry && (
          <span className="text-[10px] font-medium" style={{ color: color?.text }}>
            {entry.displayName}
          </span>
        )}
      </div>
      <div className="max-h-48 overflow-auto px-2 pb-2.5 space-y-px">
        {meaningful.map((c, i) => (
          <div
            key={i}
            className="px-2.5 py-1 font-mono text-[11px] leading-relaxed rounded"
            style={{
              backgroundColor: c.kind === 'added' ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
              borderLeft: `2px solid ${c.kind === 'added' ? 'rgb(52,211,153)' : 'rgb(248,113,113)'}`,
              color: c.kind === 'added' ? 'rgb(134,239,172)' : 'rgb(252,165,165)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-6px)',
              transition: `opacity 300ms ${EASE} ${i * 30}ms, transform 300ms ${EASE} ${i * 30}ms`,
            }}
          >
            <span className="select-none opacity-40 mr-2 inline-block w-3 text-center">
              {c.kind === 'added' ? '+' : '−'}
            </span>
            {c.line}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangeHistory({ history }) {
  const { theme } = useTheme()
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [, setTick] = useState(0)

  // Re-render every 30s so timeAgo stays current
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const filtered = filterByDate(history, dateFilter)
  const selectedEntry = selectedIdx != null ? filtered[selectedIdx] : null

  return (
    <div className="w-72 shrink-0 h-full">
      <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Düzenleme Geçmişi
          </h3>
          {filtered.length > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">{filtered.length}</span>
          )}
        </div>

        {/* Date filter */}
        <div className="px-3 py-2 border-b border-border flex gap-1 shrink-0">
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setDateFilter(f.key); setSelectedIdx(null) }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                dateFilter === f.key
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scrollable list */}
        {filtered.length > 0 ? (
          <div className="flex flex-col min-h-0">
            <ul className="py-1 overflow-auto flex-1">
              {filtered.map((entry, i) => {
                const color = getUserColor(entry.username || entry.displayName, theme)
                const isSelected = selectedIdx === i
                return (
                  <li
                    key={i}
                    onClick={() => setSelectedIdx(isSelected ? null : i)}
                    className={`flex items-start gap-2.5 px-4 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected ? 'bg-foreground/5' : 'hover:bg-foreground/[0.03]'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {entry.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium truncate leading-tight" style={{ color: color.text }}>
                          {entry.displayName}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {timeAgo(entry.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.linesAdded > 0 && (
                          <span className="text-[10px] text-emerald-400 font-medium">+{entry.linesAdded}</span>
                        )}
                        {entry.linesRemoved > 0 && (
                          <span className="text-[10px] text-red-400 font-medium">−{entry.linesRemoved}</span>
                        )}
                        {entry.linesAdded === 0 && entry.linesRemoved === 0 && (
                          <span className="text-[10px] text-muted-foreground">değişiklik yok</span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Diff detail panel */}
            {selectedEntry?.changes && selectedEntry.changes.length > 0 && (
              <div className="shrink-0">
                <DiffDetail changes={selectedEntry.changes} entry={selectedEntry} />
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Bu dönemde düzenleme yok
          </div>
        )}
      </div>
    </div>
  )
}

// Animated transition states: 'entering' | 'visible' | 'exiting'
function usePageTransition(ready) {
  const [phase, setPhase] = useState('entering')
  const pendingNav = useRef(null)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    // Double-rAF: first frame renders opacity:0, second frame triggers transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { if (!cancelled) setPhase('visible') })
    })
    return () => { cancelled = true }
  }, [ready])

  const exit = useCallback((navigateFn) => {
    if (phase === 'exiting') return
    pendingNav.current = navigateFn
    setPhase('exiting')
  }, [phase])

  // Execute navigation after exit animation completes
  useEffect(() => {
    if (phase !== 'exiting') return
    const timer = setTimeout(() => {
      pendingNav.current?.()
      pendingNav.current = null
    }, EXIT_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  // Reset when mode changes (view ↔ edit on same page)
  const reset = useCallback(() => {
    setPhase('entering')
    // Double-rAF ensures browser paints the entering state (opacity:0)
    // before transitioning to visible — prevents the "flash twice" glitch
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'))
    })
  }, [])

  return { phase, exit, reset }
}

export default function FilePage({ mode = 'view' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { on } = useSocket()
  const { theme, toggle: toggleTheme } = useTheme()

  const [file, setFile] = useState(null)
  const [lock, setLock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editedContent, setEditedContent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [blame, setBlame] = useState([])
  const [history, setHistory] = useState([])

  const isEditMode = mode === 'edit'
  const { phase, exit, reset } = usePageTransition(!loading && !!file)
  const skipLockEvent = useRef(false)
  const isSaving = useRef(false)

  // Re-trigger entrance animation when switching between view ↔ edit
  const prevMode = useRef(mode)
  useEffect(() => {
    if (prevMode.current !== mode && file) {
      prevMode.current = mode
      reset()
    }
  }, [mode, file, reset])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const t0 = Date.now()
      const data = await api.get(`/api/files/${id}`)
      setFile(data.file)
      setLock(data.lock)
      setBlame(data.blame || [])
      setHistory(data.history || [])
      setError(null)
      // Ensure skeleton is visible for at least 1.5s
      const elapsed = Date.now() - t0
      if (elapsed < 700) {
        await new Promise(r => setTimeout(r, 700 - elapsed))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const originalContent = useRef(null)

  useEffect(() => {
    if (isEditMode && file) {
      const clean = file.bodyClean ?? file.body ?? ''
      originalContent.current = clean
      setEditedContent(clean)
    }
  }, [isEditMode, file])

  const hasChanges = editedContent !== null && editedContent !== originalContent.current

  useEffect(() => {
    const offUpdated = on('file:updated', ({ id: updatedId }) => {
      if (updatedId === id && !isEditMode && !isSaving.current) load()
    })
    const offLockAcquired = on('lock:acquired', ({ id: lid, holder }) => {
      if (lid === id) {
        if (skipLockEvent.current) { skipLockEvent.current = false; return }
        setLock(holder)
      }
    })
    const offLockReleased = on('lock:released', ({ id: lid, path }) => {
      // Edit mode'dayken kendi release event'imizi yok say
      if (isEditMode) return
      if (lid === id || (file && path === file.path)) setLock(null)
    })
    const offDeleted = on('file:deleted', ({ id: did }) => {
      if (did === id) {
        toast.error('Bu dosya silindi')
        navigate('/')
      }
    })
    return () => { offUpdated(); offLockAcquired(); offLockReleased(); offDeleted() }
  }, [id, on, load, navigate, isEditMode, file])

  // Heartbeat + cleanup — sadece sayfa terk edildiğinde kilidi bırak
  useEffect(() => {
    if (!isEditMode || !id) return
    let unmountingForReal = false

    const interval = setInterval(async () => {
      try {
        await api.post(`/api/files/${id}/lock/heartbeat`)
      } catch (err) {
        if (err.status === 409) {
          // Lock lost (e.g. server restart) — try to re-acquire silently
          try {
            await api.post(`/api/files/${id}/lock`)
          } catch {
            // Someone else holds the lock now — give up
            toast.error('Kilit kayboldu. Görüntüleme moduna dönülüyor.')
            navigate(`/file/${id}`)
          }
        }
      }
    }, 30_000)

    const release = () => {
      try {
        const token = localStorage.getItem('md-reader-token')
        const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' })
        navigator.sendBeacon?.(`/api/files/${id}/lock/release`, blob)
      } catch {} // eslint-disable-line no-empty
    }
    window.addEventListener('beforeunload', release)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', release)
      // Sadece gerçek unmount'ta kilidi bırak (navigate away),
      // React Strict Mode double-invoke'da değil
      unmountingForReal = true
      setTimeout(() => {
        // Don't double-release if handleSave already released the lock
        if (unmountingForReal && !isSaving.current) {
          api.del(`/api/files/${id}/lock`).catch(() => {})
        }
      }, 100)
    }
  }, [isEditMode, id, navigate])

  const canEdit = user && (ROLE_ORDER[user.role] ?? -1) >= ROLE_ORDER.editor
  const canDelete = user?.role === 'admin'
  const lockedByOther = lock && lock.userId !== user?.id


  // --- Animated navigation handlers ---
  const animatedNavigate = useCallback((to) => {
    exit(() => navigate(to))
  }, [exit, navigate])

  const handleBack = useCallback((e) => {
    e.preventDefault()
    animatedNavigate('/')
  }, [animatedNavigate])

  const handleEdit = async () => {
    try {
      skipLockEvent.current = true
      const data = await api.post(`/api/files/${id}/lock`)
      setLock(data.lock)
      animatedNavigate(`/file/${id}/edit`)
    } catch (e) {
      skipLockEvent.current = false
      if (e.status === 409) {
        toast.error(`Dosya şu an ${e.data?.holder?.displayName || 'başka bir kullanıcı'} tarafından düzenleniyor`)
      } else {
        toast.error(e.message)
      }
    }
  }

  const doDelete = async () => {
    setDeleteConfirmOpen(false)
    try {
      await api.del(`/api/files/${id}`)
      toast.success('Dosya silindi')
      animatedNavigate('/')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const trySave = () => {
    const clean = (editedContent || '').replace(/\s/g, '')
    if (clean === '') {
      setClearConfirmOpen(true)
      return
    }
    doSave()
  }

  const doSave = async () => {
    setClearConfirmOpen(false)
    try {
      setSaving(true)
      isSaving.current = true
      await api.put(`/api/files/${id}`, { body: editedContent })
      await api.del(`/api/files/${id}/lock`).catch(() => {})
      toast.success('Kaydedildi')
      // Full page navigation to view mode — forces clean remount
      window.location.replace(`/file/${id}`)
    } catch (e) {
      toast.error(e.message)
      setSaving(false)
      isSaving.current = false
    }
  }

  const handleCancel = () => {
    animatedNavigate(`/file/${id}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Home size={14} /> Anasayfa</span>
            <div className="w-px h-4 bg-border" />
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-7 w-3/4 rounded bg-muted animate-pulse" />
            <div className="space-y-2.5 mt-6">
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
              <div className="h-4 w-0" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <div className="w-64 shrink-0">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="py-3 space-y-3 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
  if (error) return <div className="min-h-screen flex items-center justify-center text-sm text-destructive">{error}</div>
  if (!file) return null

  const show = phase === 'visible'
  const exiting = phase === 'exiting'

  const anim = (delay = 0) => ({
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0) scale(1)' : (exiting ? 'translateY(-8px) scale(0.995)' : 'translateY(12px) scale(0.995)'),
    transition: exiting
      ? `opacity ${EXIT_DURATION}ms ${EASE}, transform ${EXIT_DURATION}ms ${EASE}`
      : `opacity ${DURATION}ms ${EASE} ${delay}ms, transform ${DURATION}ms ${EASE} ${delay}ms`,
  })

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="border-b z-10 bg-background/95 backdrop-blur-sm shrink-0">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Home size={14} />
              Anasayfa
            </a>
            <div className="w-px h-4 bg-border shrink-0" />
            <span className="font-semibold truncate">{file.title}</span>
            <Badge variant="secondary" className="font-normal shrink-0">{file.category}</Badge>
            {lockedByOther && (
              <span style={{ opacity: show ? 1 : 0, transition: `opacity ${DURATION}ms ${EASE} 60ms` }}>
                <LockBadge holder={lock} className="shrink-0" />
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 shrink-0"
            style={{ opacity: show ? 1 : 0, transition: `opacity ${DURATION}ms ${EASE} 60ms` }}
          >
            {!isEditMode && canEdit && !lockedByOther && (
              <Button size="sm" onClick={handleEdit}>Düzenle</Button>
            )}
            {!isEditMode && canDelete && !lockedByOther && (
              <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>Sil</Button>
            )}
            {isEditMode && (
              <>
                <Button size="sm" onClick={trySave} disabled={saving || !hasChanges}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={saving}>
                  Vazgeç
                </Button>
              </>
            )}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dosyayı Sil</DialogTitle>
            <DialogDescription>
              <strong>{file.title}</strong> dosyası kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              İptal
            </Button>
            <Button size="sm" variant="destructive" onClick={doDelete}>
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tüm içerik silinecek</DialogTitle>
            <DialogDescription>
              Dosyanın tüm içeriği boş olarak kaydedilecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setClearConfirmOpen(false)}>
              İptal
            </Button>
            <Button size="sm" variant="destructive" onClick={doSave}>
              Evet, Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-6 py-6 flex-1 min-h-0">
        {!isEditMode ? (
          <div className="flex gap-8 h-full">
            <div className="flex-1 min-w-0 overflow-auto">
              <div
                className="mb-6 text-xs text-muted-foreground flex items-center gap-3"
                style={anim(60)}
              >
                <span>{file.fileName}</span>
                <span>•</span>
                <span>{file.date}</span>
              </div>
              <div style={anim(120)}>
                <MarkdownPreview content={file.body} />
              </div>
            </div>
            <div style={anim(180)} className="h-full">
              <ChangeHistory history={history} />
            </div>
          </div>
        ) : (
          <div className="flex gap-6 h-full">
            <div className="flex-1 min-w-0" style={anim(60)}>
              {editedContent !== null ? (
                <MarkdownEditor
                  key={id}
                  value={editedContent}
                  onChange={setEditedContent}
                  blame={hasChanges ? [] : toBlockBlame(file?.bodyClean ?? file?.body ?? '', blame)}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </div>
            <div style={anim(120)} className="h-full">
              <ChangeHistory history={history} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
