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
import {
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlinePencil,
  HiOutlineCalendar,
} from 'react-icons/hi'

const CATEGORY_COLORS = {
  notes: 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  guides: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
  logs: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
  ideas: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
}

const CATEGORY_LABELS = {
  notes: 'Notlar',
  guides: 'Rehberler',
  logs: 'Loglar',
  ideas: 'Fikirler',
}

const STAT_CONFIGS = [
  { key: 'totalFiles', label: 'Toplam Dosya', icon: HiOutlineDocumentText, color: 'text-blue-400', bg: 'bg-blue-500/10', borderColor: 'hover:border-blue-500/30' },
  { key: 'totalCategories', label: 'Kategori', icon: HiOutlineFolder, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'hover:border-emerald-500/30' },
  { key: 'totalWords', label: 'Toplam Kelime', icon: HiOutlinePencil, color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'hover:border-purple-500/30' },
  { key: 'lastUpdated', label: 'Son Guncelleme', icon: HiOutlineCalendar, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'hover:border-amber-500/30' },
]

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
    totalWords: allFiles.reduce((sum, f) => sum + f.wordCount, 0).toLocaleString('tr-TR'),
    lastUpdated: allFiles.length > 0 ? allFiles[0].date : '-',
  }), [allFiles, categories])

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-10 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/10 transition-transform duration-300 hover:scale-110 hover:shadow-purple-500/20">
              <VscMarkdown className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">MD Reader</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Merhaba, <span className="text-white font-medium">{user?.username}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
            >
              <HiOutlineLogout className="w-4 h-4 mr-2" />
              Cikis
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STAT_CONFIGS.map((stat, i) => (
            <Card
              key={stat.key}
              className={`bg-slate-900/60 border-slate-800/60 transition-all duration-300 ${stat.borderColor} hover:bg-slate-900/80 hover:shadow-lg group animate-fade-in-up stagger-${i + 1}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats[stat.key]}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in-up stagger-5">
          <div className="relative flex-1 group">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors duration-300 group-focus-within:text-purple-400" />
            <Input
              placeholder="Dosya ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 transition-all duration-300 hover:bg-slate-900/70 hover:border-slate-700"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                !activeCategory
                  ? 'bg-white/10 text-white border-white/30 shadow-sm'
                  : 'text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
              }`}
              onClick={() => setActiveCategory(null)}
            >
              Tumu ({allFiles.length})
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant="outline"
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  activeCategory === cat
                    ? CATEGORY_COLORS[cat] + ' shadow-sm'
                    : 'text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }`}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {CATEGORY_LABELS[cat] || cat} ({allFiles.filter(f => f.category === cat).length})
              </Badge>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="bg-slate-900/40 border-slate-800/60 overflow-hidden animate-fade-in-up stagger-6">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800/60 hover:bg-transparent">
                <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Baslik</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Kategori</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Tarih</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs uppercase tracking-wider text-right">Kelime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-600">
                      <HiOutlineDocumentText className="w-12 h-12 opacity-50" />
                      <p className="text-sm">Dosya bulunamadi</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file, i) => (
                  <TableRow
                    key={file.id}
                    className={`border-slate-800/40 hover:bg-slate-800/40 cursor-pointer transition-all duration-200 group animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-800/60 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-purple-500/15 group-hover:scale-110">
                          <VscMarkdown className="w-4 h-4 text-slate-500 transition-colors duration-300 group-hover:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 transition-colors duration-200 group-hover:text-white">{file.title}</p>
                          <p className="text-xs text-slate-600 font-mono">{file.fileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${CATEGORY_COLORS[file.category]} transition-all duration-300`}>
                        {CATEGORY_LABELS[file.category] || file.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 text-sm tabular-nums">{file.date}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-500 text-sm tabular-nums">{file.wordCount.toLocaleString('tr-TR')}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Table footer */}
          {filteredFiles.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-800/40 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                {filteredFiles.length} / {allFiles.length} dosya gosteriliyor
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-600">Guncel</span>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
