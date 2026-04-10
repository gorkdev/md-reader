import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const ROLE_LABELS = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_COLORS = {
  admin: 'text-red-400 bg-red-500/10',
  editor: 'text-blue-400 bg-blue-500/10',
  viewer: 'text-zinc-400 bg-zinc-500/10',
}

export default function PresenceIndicator({ users }) {
  const count = users?.length || 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-accent/50 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm"
        >
          {count > 0 ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground">{count} online</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              <span className="text-muted-foreground">Çevrimdışı</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Online — {count}
          </p>
        </div>
        {count > 0 ? (
          <ul className="py-1 max-h-72 overflow-auto">
            {users.map(u => (
              <li
                key={u.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="truncate">{u.displayName}</span>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${ROLE_COLORS[u.role] || ROLE_COLORS.viewer}`}
                >
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Şu an kimse online değil
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
