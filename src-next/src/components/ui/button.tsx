import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
  Board buttons (Main: .btn, admin density): 36px, 13px/600, 8px radius, no shadows, 3px Navy 200 focus outline.
  shadcn variant names are kept for the existing pages:
    default     = .btn-primary   (navy gradient; disabled turns Navy 100 with muted text)
    outline     = .btn-secondary (white, line border, navy tint on hover)
    secondary   = navy tint      (Navy 50 fill, navy text)
    ghost       = .btn-ghost
    destructive = .btn-danger
    link        = navy text link
  `primary`, `danger` are the boards' names for default and destructive.
*/
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-[13px] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color] duration-200 ease-standard active:scale-[.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200 focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-brand bg-(image:--grad-btn) text-white hover:bg-(image:--grad-btn-hover) hover:text-white disabled:border-transparent disabled:bg-brand-100 disabled:bg-none disabled:text-muted disabled:opacity-100",
        primary:
          "border-brand bg-(image:--grad-btn) text-white hover:bg-(image:--grad-btn-hover) hover:text-white disabled:border-transparent disabled:bg-brand-100 disabled:bg-none disabled:text-muted disabled:opacity-100",
        destructive: "bg-danger text-white hover:bg-[#A30000] hover:text-white",
        danger: "bg-danger text-white hover:bg-[#A30000] hover:text-white",
        outline:
          "border-line bg-surface text-ink hover:border-brand-200 hover:bg-brand-50 hover:text-brand",
        secondary: "bg-brand-50 text-brand hover:bg-brand-100",
        ghost: "bg-transparent text-ink-2 hover:bg-line-2 hover:text-ink",
        link: "h-auto px-0 text-brand underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3.5",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-[42px] rounded-[10px] px-5 text-[15px] has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-[42px] rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
