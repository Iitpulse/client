import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
  Board badges (Main: .badge): 24px pill, 12px/600, tinted fill, no border.
  shadcn names kept for existing pages, mapped onto the board tints:
    default = navy (.b-navy)   secondary = grey (.b-grey)   destructive = red (.b-red)
    success = green (.b-green) warning = amber (.b-amber)   outline = line border
  The boards' own names: navy, live, green, amber, grey, sky, red.
*/
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-[9px] text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200 focus-visible:outline-solid [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-brand-50 text-brand [a&]:hover:bg-brand-100",
        navy: "bg-brand-50 text-brand [a&]:hover:bg-brand-100",
        secondary: "bg-line-2 text-muted [a&]:hover:bg-line",
        grey: "bg-line-2 text-muted [a&]:hover:bg-line",
        destructive: "bg-danger-50 text-danger",
        red: "bg-danger-50 text-danger",
        live: "bg-danger-50 text-danger",
        success: "bg-success-50 text-success",
        green: "bg-success-50 text-success",
        warning: "bg-warning-50 text-warning",
        amber: "bg-warning-50 text-warning",
        sky: "bg-info-50 text-info",
        outline: "border-line bg-surface text-ink-2 [a&]:hover:border-brand-200 [a&]:hover:text-brand",
        ghost: "text-ink-2 [a&]:hover:bg-line-2",
        link: "text-brand underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
