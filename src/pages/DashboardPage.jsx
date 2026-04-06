import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { loadMarkdownFiles } from '@/lib/mdLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AnimatedTabs,
  TabsList,
  TabsTrigger,
  AnimatedTabsContent,
  useRegisterTabs,
} from '@/components/ui/tabs'
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

function FileTable({ files }) {
  if (files.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No files found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Words</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map(file => (
          <TableRow key={file.id} className="cursor-pointer">
            <TableCell>
              <div>
                <p className="font-medium">{file.title}</p>
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
              {file.wordCount.toLocaleString('en-US')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TabContent({ allFiles, categories, search }) {
  const tabValues = useMemo(() => ['all', ...categories], [categories])
  useRegisterTabs(tabValues)

  const filterBySearch = (files) => {
    if (!search) return files
    const q = search.toLowerCase()
    return files.filter(f =>
      f.title.toLowerCase().includes(q) ||
      f.fileName.toLowerCase().includes(q)
    )
  }

  return (
    <>
      <AnimatedTabsContent value="all" className="m-0">
        <FileTable files={filterBySearch(allFiles)} />
      </AnimatedTabsContent>
      {categories.map(cat => (
        <AnimatedTabsContent key={cat} value={cat} className="m-0">
          <FileTable files={filterBySearch(allFiles.filter(f => f.category === cat))} />
        </AnimatedTabsContent>
      ))}
    </>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const allFiles = useMemo(() => loadMarkdownFiles(), [])
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    return [...new Set(allFiles.map(f => f.category))]
  }, [allFiles])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold">MD Reader</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 max-w-sm">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <AnimatedTabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 border rounded-lg overflow-hidden">
            <TabContent allFiles={allFiles} categories={categories} search={search} />
          </div>
        </AnimatedTabs>
      </main>
    </div>
  )
}
