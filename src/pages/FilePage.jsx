import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MarkdownPreview from '@/components/MarkdownPreview'
import MarkdownEditor from '@/components/MarkdownEditor'
import LockBadge from '@/components/LockBadge'

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2 }
const ANNOTATION_RE = /^<!--\s*düzenleyen:\s*(.+?)\s+—\s+(.+?)\s*-->$/

function parseAnnotations(body) {
  if (!body) return []
  const lines = body.split('\n')
  const entries = []
  const seen = new Set()
  for (const line of lines) {
    const m = line.match(ANNOTATION_RE)
    if (m) {
      const key = `${m[1]}|${m[2]}`
      if (!seen.has(key)) {
        seen.add(key)
        entries.push({ user: m[1], date: m[2] })
      }
    }
  }
  entries.sort((a, b) => {
    const parse = (d) => {
      const [datePart, timePart] = d.split(' ')
      const [dd, mm, yyyy] = datePart.split('/')
      return new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}`)
    }
    return parse(b.date) - parse(a.date)
  })
  return entries
}

function ChangeHistory({ annotations }) {
  return (
    <div className="w-64 shrink-0">
      <div className="border border-border rounded-lg bg-card overflow-hidden sticky top-20">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Düzenleme Geçmişi
          </h3>
        </div>
        {annotations.length > 0 ? (
          <ul className="py-2 max-h-[calc(100vh-12rem)] overflow-auto">
            {annotations.map((a, i) => (
              <li key={i} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {a.user.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate leading-tight">{a.user}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{a.date}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Henüz düzenleme yok
          </div>
        )}
      </div>
    </div>
  )
}

export default function FilePage({ mode = 'view' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { on } = useSocket()

  const [file, setFile] = useState(null)
  const [lock, setLock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editedContent, setEditedContent] = useState(null)
  const [saving, setSaving] = useState(false)

  const isEditMode = mode === 'edit'

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

  useEffect(() => {
    if (isEditMode && file) setEditedContent(file.bodyClean ?? file.body ?? '')
  }, [isEditMode, file])

  useEffect(() => {
    const offUpdated = on('file:updated', ({ id: updatedId }) => {
      if (updatedId === id && !isEditMode) load()
    })
    const offLockAcquired = on('lock:acquired', ({ id: lid, holder }) => {
      if (lid === id) setLock(holder)
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

    const interval = setInterval(() => {
      api.post(`/api/files/${id}/lock/heartbeat`).catch(err => {
        if (err.status === 409) {
          toast.error('Kilit kayboldu (timeout). Görüntüleme moduna dönülüyor.')
          navigate(`/file/${id}`)
        }
      })
    }, 30_000)

    const release = () => {
      try { navigator.sendBeacon?.(`/api/files/${id}/lock`, '') } catch {}
    }
    window.addEventListener('beforeunload', release)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', release)
      // Sadece gerçek unmount'ta kilidi bırak (navigate away),
      // React Strict Mode double-invoke'da değil
      unmountingForReal = true
      setTimeout(() => {
        if (unmountingForReal) {
          api.del(`/api/files/${id}/lock`).catch(() => {})
        }
      }, 100)
    }
  }, [isEditMode, id, navigate])

  const canEdit = user && (ROLE_ORDER[user.role] ?? -1) >= ROLE_ORDER.editor
  const canDelete = user?.role === 'admin'
  const lockedByOther = lock && lock.userId !== user?.id

  const annotations = useMemo(() => parseAnnotations(file?.body), [file?.body])

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

  const handleSave = async () => {
    try {
      setSaving(true)
      const data = await api.put(`/api/files/${id}`, { body: editedContent })
      setFile(data.file)
      setEditedContent(data.file.bodyClean ?? data.file.body ?? '')
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Yükleniyor...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-sm text-destructive">{error}</div>
  if (!file) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              ← Geri
            </Link>
            <div className="w-px h-4 bg-border shrink-0" />
            <span className="font-semibold truncate">{file.title}</span>
            <Badge variant="secondary" className="font-normal shrink-0">{file.category}</Badge>
            {lock && <LockBadge holder={lock} className="shrink-0" />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {!isEditMode ? (
          <div className="flex gap-8">
            <div className="flex-1 min-w-0">
              <div className="mb-6 text-xs text-muted-foreground flex items-center gap-3">
                <span>{file.fileName}</span>
                <span>•</span>
                <span>{file.date}</span>
              </div>
              <MarkdownPreview content={file.body} />
            </div>
            <ChangeHistory annotations={annotations} />
          </div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-7rem)]">
            <div className="flex-1 min-w-0">
              {editedContent !== null ? (
                <MarkdownEditor
                  key={id}
                  value={editedContent}
                  onChange={setEditedContent}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Yükleniyor...
                </div>
              )}
            </div>
            <ChangeHistory annotations={annotations} />
          </div>
        )}
      </main>
    </div>
  )
}
