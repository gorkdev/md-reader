import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const COLORS = [
  { name: 'Mavi', value: '#60a5fa' },
  { name: 'Yeşil', value: '#4ade80' },
  { name: 'Turuncu', value: '#fb923c' },
  { name: 'Pembe', value: '#f472b6' },
  { name: 'Sarı', value: '#facc15' },
  { name: 'Turkuaz', value: '#2dd4bf' },
  { name: 'Mor', value: '#a78bfa' },
  { name: 'Kırmızı', value: '#f87171' },
]

export default function CreateUserDialog({ children }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('editor')
  const [color, setColor] = useState(COLORS[0].value)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setUsername('')
    setDisplayName('')
    setPassword('')
    setRole('editor')
    setColor(COLORS[0].value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !displayName || !password) return

    try {
      setSubmitting(true)
      const data = await api.post('/api/users', { username, displayName, password, role, color })
      toast.success(`${data.user.displayName} oluşturuldu`)
      reset()
      setOpen(false)
    } catch (err) {
      toast.error(err.data?.error || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <span onClick={() => setOpen(true)}>{children}</span>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kullanıcı Oluştur</DialogTitle>
          <DialogDescription>Yeni bir kullanıcı hesabı oluşturun.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kullanıcı Adı</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ornek"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Görünen Ad</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Örnek Kullanıcı"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 4 karakter"
              required
              minLength={4}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rol</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Renk</label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span>{COLORS.find(c => c.value === color)?.name}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.value }}
                        />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
