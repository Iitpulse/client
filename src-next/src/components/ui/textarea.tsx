import * as React from "react"
import { cn } from "@/lib/utils"

/* Admin textarea (boards: textarea.input): 10px radius, line border, 13px/1.5, no shadow; same focus as Input. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] leading-normal text-ink transition-[color,border-color] outline-none placeholder:text-[#6B7089] hover:border-[#CDD0DE] disabled:cursor-not-allowed disabled:bg-ground disabled:opacity-60",
        "focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-brand-200",
        "aria-invalid:border-danger aria-invalid:outline-3 aria-invalid:outline-solid aria-invalid:outline-danger-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
