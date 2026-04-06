import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props} />
  );
}

function TabsList({
  className,
  children,
  ...props
}) {
  const listRef = React.useRef(null)
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 })

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector('[data-state="active"]')
    if (!active) return
    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
    })
  }, [])

  React.useEffect(() => {
    updateIndicator()
    const observer = new MutationObserver(updateIndicator)
    if (listRef.current) {
      observer.observe(listRef.current, { attributes: true, subtree: true, attributeFilter: ['data-state'] })
    }
    return () => observer.disconnect()
  }, [updateIndicator])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground h-9",
        className
      )}
      {...props}
    >
      <div
        className="absolute top-1 h-[calc(100%-8px)] rounded-md bg-background border transition-all duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
        "text-muted-foreground hover:text-foreground",
        "data-[state=active]:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props} />
  );
}

function TabsContent({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150",
        className
      )}
      {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
