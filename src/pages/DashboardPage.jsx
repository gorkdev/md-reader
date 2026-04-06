import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { loadMarkdownFiles } from '@/lib/mdLoader'
import { Button } from '@/components/ui/button'
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

function FileTable({ files }) {
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
            style={{
              animation: 'tableRowIn 0.3s ease-out both',
              animationDelay: `${i * 30}ms`,
            }}
          >
            <TableCell>
              <div>
                <p className="font-medium group-hover:text-foreground transition-colors">{file.title}</p>
                <p className="text-xs text-muted-foreground">{file.fileName}</p>
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
  const allFiles = useMemo(() => loadMarkdownFiles(), [])
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const categories = useMemo(() => {
    return [...new Set(allFiles.map(f => f.category))]
  }, [allFiles])

  const initial = user?.username?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold">MD Reader</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 border rounded-lg px-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                {initial}
              </div>
              <span className="text-sm font-medium capitalize">{user?.username}</span>
            </div>
            <Button variant="destructive" size="xs" onClick={logout}>
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {/* Title */}
        <div
          className="mb-10 transition-all duration-700 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Files</h1>
          <p className="text-sm text-muted-foreground">
            {allFiles.length} markdown files across {categories.length} categories
          </p>
        </div>

        {/* Controls + Table */}
        <Tabs defaultValue="all" className="w-full">
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '80ms',
            }}
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

          <div
            className="border rounded-lg transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: '160ms',
            }}
          >
            <TabsContent value="all" className="m-0">
              <FileTable files={filterBySearch(allFiles, search)} />
            </TabsContent>
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="m-0">
                <FileTable files={filterBySearch(allFiles.filter(f => f.category === cat), search)} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </main>
    </div>
  )
}
