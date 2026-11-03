import * as React from "react"
import { cn } from "@/lib/utils"

/*
  Admin field (boards: .input at admin density): 36px, 10px radius, line border, 13px text, no shadow.
  Focus: navy border + 3px Navy 200 outline. Invalid (aria-invalid): Red 600 border + Red 50 outline.
*/
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-1 text-[13px] text-ink transition-[color,border-color] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-ink placeholder:text-[#6B7089] hover:border-[#CDD0DE] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-ground disabled:opacity-60",
        "focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-brand-200",
        "aria-invalid:border-danger aria-invalid:outline-3 aria-invalid:outline-solid aria-invalid:outline-danger-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
