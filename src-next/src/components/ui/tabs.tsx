"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

/*
  Board tabs at admin density. default = the segmented control (.seg / .tab): Line 2 track, the active tab
  white with a 1px line edge (no shadow). line = underline tabs (.underline-tabs / .utab).
  Spacing stays the old shadcn one (no gap on the root, content mt-2) so existing pages keep their layout.
*/
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center justify-center text-muted group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "h-9 gap-0.5 rounded-[10px] bg-line-2 p-[3px]",
        line: "h-auto gap-6 rounded-none border-b border-line bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-2 text-[13px] font-semibold whitespace-nowrap text-muted transition-[color,background-color,border-color] duration-200 ease-standard hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200 focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-ink group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:h-[30px] group-data-[variant=default]/tabs-list:rounded-lg group-data-[variant=default]/tabs-list:border group-data-[variant=default]/tabs-list:border-transparent group-data-[variant=default]/tabs-list:px-3.5 group-data-[variant=default]/tabs-list:data-[state=active]:border-line group-data-[variant=default]/tabs-list:data-[state=active]:bg-surface",
        "group-data-[variant=line]/tabs-list:py-3 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:bg-brand after:transition-transform after:duration-200 group-data-[variant=line]/tabs-list:hover:after:scale-x-100 group-data-[variant=line]/tabs-list:data-[state=active]:after:scale-x-100 group-data-[variant=default]/tabs-list:after:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-2 outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200 focus-visible:outline-solid",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
