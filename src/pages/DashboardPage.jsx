import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { loadMarkdownFiles } from '@/lib/mdLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { VscMarkdown } from 'react-icons/vsc'
import { HiOutlineLogout, HiOutlineSearch, HiOutlineDocumentText, HiOutlineFolder, HiOutlinePencil, HiOutlineCalendar } from 'react-icons/hi'

const CATEGORY_COLORS = {
  notes: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  guides: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  logs: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ideas: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

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

  const stats = useMemo(() => ({
    totalFiles: allFiles.length,
    totalCategories: categories.length,
    totalWords: allFiles.reduce((sum, f) => sum + f.wordCount, 0),
    lastUpdated: allFiles.length > 0 ? allFiles[0].date : '-',
  }), [allFiles, categories])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <VscMarkdown className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">MD Reader</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Merhaba, <span className="text-white font-medium">{user?.username}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <HiOutlineLogout className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Toplam Dosya', value: stats.totalFiles, icon: HiOutlineDocumentText, color: 'text-blue-400' },
            { label: 'Kategori', value: stats.totalCategories, icon: HiOutlineFolder, color: 'text-emerald-400' },
            { label: 'Toplam Kelime', value: stats.totalWords.toLocaleString('tr-TR'), icon: HiOutlinePencil, color: 'text-purple-400' },
            { label: 'Son Güncelleme', value: stats.lastUpdated, icon: HiOutlineCalendar, color: 'text-amber-400' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Dosya ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                !activeCategory
                  ? 'bg-white/10 text-white border-white/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
              onClick={() => setActiveCategory(null)}
            >
              Tümü ({allFiles.length})
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant="outline"
                className={`cursor-pointer transition-all ${
                  activeCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : 'text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {CATEGORY_LABELS[cat] || cat} ({allFiles.filter(f => f.category === cat).length})
              </Badge>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Başlık</TableHead>
                <TableHead className="text-slate-400">Kategori</TableHead>
                <TableHead className="text-slate-400">Tarih</TableHead>
                <TableHead className="text-slate-400 text-right">Kelime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                    Dosya bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map(file => (
                  <TableRow key={file.id} className="border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <VscMarkdown className="w-5 h-5 text-slate-500 shrink-0" />
                        <div>
                          <p className="font-medium text-white">{file.title}</p>
                          <p className="text-xs text-slate-500">{file.fileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CATEGORY_COLORS[file.category]}>
                        {CATEGORY_LABELS[file.category] || file.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{file.date}</TableCell>
                    <TableCell className="text-right text-slate-400">{file.wordCount.toLocaleString('tr-TR')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  )
}
