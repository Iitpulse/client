"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Board filter chip ("Subject: any ▾") opening a short single-choice list. */
export function FilterChip({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value)?.label;
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button type="button" className={`chip h-9 ${value ? "on" : ""}`} disabled={disabled} aria-label={`${label}: ${current ?? "any"}`}>
          <span className="max-w-[180px] truncate">
            {label}: {current ?? "any"}
          </span>
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        {options.length > 8 && (
          <input
            className="input mb-1.5 h-8 text-[13px]"
            placeholder={`Search ${label.toLowerCase()}`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={`Search ${label.toLowerCase()}`}
          />
        )}
        <div className="col max-h-72 overflow-y-auto">
          <button
            type="button"
            className="row sm rounded-md px-2.5 py-1.5 text-left hover:bg-ground"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            <span className="grow">Any</span>
            {!value && <Check className="size-4 text-brand" aria-hidden />}
          </button>
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              className="row sm rounded-md px-2.5 py-1.5 text-left hover:bg-ground"
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span className="grow truncate">{o.label}</span>
              {value === o.value && <Check className="size-4 text-brand" aria-hidden />}
            </button>
          ))}
          {!shown.length && <span className="xs muted px-2.5 py-2">Nothing matches.</span>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
