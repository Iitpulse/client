"use client";
/*
  The picker's right-hand panel (board Admin-QuestionPicker aside): the sub-section, its rule and tally, the picked
  questions in paper order (drag the grip or use ↑/↓ on it to reorder, × to remove), paragraph sets as one block
  ("Set 1 · Q21–23", the questions move and leave together), empty slots, the difficulty mix and image count.
*/
import { useState, type DragEvent, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { InlineNote } from "@/components/kit";
import { slotNumbers } from "@/lib/m6/paper";
import { mixLabel, shortId, Stem, type PaperSub } from "./parts";

const SHOW = 5;

export function PickedPanel({
  sub,
  start,
  title,
  rule,
  locked,
  busy,
  overFill,
  onRemove,
  onMove,
}: {
  sub: PaperSub;
  /** paper number of the first empty slot */
  start: number;
  title: string;
  rule: string;
  locked: boolean;
  busy: boolean;
  /** a selection bigger than the free slots (board state over-fill) */
  overFill: boolean;
  onRemove: (questionId: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [all, setAll] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const isSet = sub.type === "paragraph";
  const setSize = sub.paragraph?.setSize ?? 1;
  const full = sub.have >= sub.need;
  const slots = sub.slots;
  const shown = all || isSet ? slots : slots.slice(0, SHOW);
  const hidden = slots.length - shown.length;
  const emptyCount = isSet ? Math.max(0, Math.floor((sub.need - sub.have) / setSize)) : Math.max(0, sub.need - sub.have);
  const firstEmptyN = start;
  const images = slots.filter((s) => s.flags.needsLatex > 0).length;
  const can = !locked && !busy;

  const keyMove = (i: number) => (e: KeyboardEvent) => {
    if (!can) return;
    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      onMove(i, i - 1);
    } else if (e.key === "ArrowDown" && i < slots.length - 1) {
      e.preventDefault();
      onMove(i, i + 1);
    }
  };
  const dnd = (i: number) => ({
    draggable: can,
    onDragStart: (e: DragEvent) => {
      setDrag(i);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: DragEvent) => {
      if (drag === null) return;
      e.preventDefault();
      setOver(i);
    },
    onDragLeave: () => setOver((o) => (o === i ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (drag !== null && drag !== i) onMove(drag, i);
      setDrag(null);
      setOver(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setOver(null);
    },
  });

  return (
    <section className="card pad col gap-2.5" aria-label={`Picked for ${title}`}>
      <div className="row between gap-2">
        <span className="col min-w-0 gap-px">
          <span className="sm truncate font-semibold">{title}</span>
          <span className="xs muted">{rule}</span>
        </span>
        <span className={`badge ${full ? "b-green" : "b-amber"} num shrink-0`}>
          {sub.have} of {sub.need}
        </span>
      </div>

      {((full && !isSet) || overFill) && !locked && (
        <InlineNote tone="warn">This section is full. Remove one to add another, or use Replace on a row.</InlineNote>
      )}

      {isSet ? (
        <div className="col gap-2">
          {slots.map((s, i) => (
            <div key={s.questionId} className={`qp-pset ${over === i ? "drop" : ""}`} {...dnd(i)}>
              <div className="hd">
                <button type="button" className="qp-ib grab" aria-label={`Drag to reorder Set ${i + 1}, or use the arrow keys`} disabled={!can} onKeyDown={keyMove(i)}>
                  <GripVertical className="size-3.5" aria-hidden />
                </button>
                <span className="badge b-navy">
                  Set {i + 1} · {slotNumbers(s.n, s.count)}
                </span>
                <span className="mono xs muted">{shortId(s.questionId)}</span>
                <span className="row ml-auto">
                  {i > 0 && (
                    <button type="button" className="qp-ib" aria-label={`Move Set ${i + 1} up`} disabled={!can} onClick={() => onMove(i, i - 1)}>
                      <ChevronUp className="size-3.5" aria-hidden />
                    </button>
                  )}
                  {i < slots.length - 1 && (
                    <button type="button" className="qp-ib" aria-label={`Move Set ${i + 1} down`} disabled={!can} onClick={() => onMove(i, i + 1)}>
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  )}
                  <button type="button" className="qp-ib danger-hover" aria-label={`Remove Set ${i + 1}`} disabled={!can} onClick={() => onRemove(s.questionId)}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              </div>
              <span className="q">
                <Stem text={s.stemPreview} className="qp-ell font-serif text-[13.5px]" />
              </span>
              <span className="q" style={{ paddingBottom: i === 0 ? 0 : 8 }}>
                <span className="mono xs muted">{slotNumbers(s.n, s.count)}</span>
                {s.count} questions{s.difficulty ? ` · ${s.difficulty}` : ""}
                {s.flags.needsLatex > 0 && <span className="badge b-amber">Image</span>}
              </span>
              {i === 0 && <span className="q xs muted" style={{ paddingBottom: 8 }}>The {s.count} questions move and leave together.</span>}
            </div>
          ))}
          {Array.from({ length: emptyCount }, (_, k) => (
            <div key={`e${k}`} className="qp-pset empty">
              Set {slots.length + k + 1} · {setSize} empty slots. Add a set of {setSize} from the list.
            </div>
          ))}
        </div>
      ) : (
        <div className="col gap-1.5">
          {shown.map((s, i) => (
            <div key={s.questionId} className={`qp-pk ${over === i ? "drop" : ""}`} {...dnd(i)}>
              <button type="button" className="qp-ib grab" aria-label={`Drag to reorder question ${s.n}, or use the arrow keys`} disabled={!can} onKeyDown={keyMove(i)}>
                <GripVertical className="size-3" aria-hidden />
              </button>
              <span className="no">{s.n}</span>
              <Stem text={s.stemPreview} className="qp-ell grow font-serif" />
              {s.flags.needsLatex > 0 && (
                <span className="badge b-amber" title="Equation is an image">
                  Image
                </span>
              )}
              <button type="button" className="qp-ib danger-hover" aria-label={`Remove question ${s.n}`} disabled={!can} onClick={() => onRemove(s.questionId)}>
                <X className="size-3" aria-hidden />
              </button>
            </div>
          ))}
          {hidden > 0 && (
            <button type="button" className="qp-more" onClick={() => setAll(true)}>
              {hidden} more: {hidden === 1 ? slots[shown.length].n : `${slots[shown.length].n} to ${slots[slots.length - 1].n}`}
            </button>
          )}
          {all && slots.length > SHOW && (
            <button type="button" className="qp-more" onClick={() => setAll(false)}>
              Show fewer
            </button>
          )}
          {Array.from({ length: Math.min(emptyCount, 3) }, (_, k) => (
            <div key={`e${k}`} className="qp-pk empty">
              <span className="no">{firstEmptyN + k}</span>
              Empty slot
            </div>
          ))}
          {emptyCount > 3 && <span className="xs muted pl-1">and {emptyCount - 3} more empty slots</span>}
        </div>
      )}

      <div className="row between wrap gap-2 border-t border-[#EEF0F5] pt-2">
        <span className="xs muted">{mixLabel(sub)}</span>
        {images > 0 && <span className="xs muted">{images === 1 ? "1 with an equation image" : `${images} with an equation image`}</span>}
      </div>
    </section>
  );
}
