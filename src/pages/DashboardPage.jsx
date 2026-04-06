import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { loadMarkdownFiles } from '@/lib/mdLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CATEGORY_LABELS = {
  notes: 'Notlar',
  guides: 'Rehberler',
  logs: 'Loglar',
  ideas: 'Fikirler',
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const allFiles = useMemo(() => loadMarkdownFiles(), [])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const categories = useMemo(() => {
    return [...new Set(allFiles.map(f => f.category))]
  }, [allFiles])

  const filteredFiles = useMemo(() => {
    return allFiles.filter(file => {
      const matchesSearch = !search ||
        file.title.toLowerCase().includes(search.toLowerCase()) ||
        file.fileName.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !activeCategory || file.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [allFiles, search, activeCategory])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">MD Reader</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">Dosyalar</h1>
          <p className="text-sm text-muted-foreground">
            {allFiles.length} markdown dosyası
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              placeholder="Dosya ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={!activeCategory ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className="h-8 text-xs"
            >
              Tümü
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className="h-8 text-xs"
              >
                {CATEGORY_LABELS[cat] || cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Kelime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    Dosya bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map(file => (
                  <TableRow key={file.id} className="cursor-pointer">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{file.title}</p>
                        <p className="text-xs text-muted-foreground">{file.fileName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {CATEGORY_LABELS[file.category] || file.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {file.date}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {file.wordCount.toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredFiles.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {filteredFiles.length} / {allFiles.length} dosya gösteriliyor
          </p>
        )}
      </main>
    </div>
  )
}
