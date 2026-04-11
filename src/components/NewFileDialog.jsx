import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

const CATEGORIES = ['notes', 'guides', 'logs', 'ideas']

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewFileDialog({ onCreated, children }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('notes')
  const [title, setTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    let finalName = fileName.trim()
    if (!finalName) {
      const slug = slugify(title.trim() || 'new-file')
      finalName = `${slug || 'new-file'}.md`
    }
    if (!finalName.endsWith('.md')) {
      toast.error('File name must end with .md')
      return
    }
    try {
      setSaving(true)
      const res = await api.post('/api/files', {
        category,
        fileName: finalName,
        title: title.trim() || finalName.replace('.md', ''),
      })
      toast.success('File created')
      setOpen(false)
      setTitle('')
      setFileName('')
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
          <DialogTitle>New file</DialogTitle>
          <DialogDescription>Create a new markdown file.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="File title" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">File name (optional)</label>
            <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="note-001.md" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
