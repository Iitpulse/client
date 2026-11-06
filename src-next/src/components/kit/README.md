# Admin kit (`@/components/kit`)

The canvas Kit-* boards (Kit-Pickers, Kit-Forms, Kit-Overlays, Kit-Feedback, Kit-Data, Kit-States; approved 5 Nov 2026)
as React components. Import everything from `@/components/kit`. Styles are in `kit.css` (imported by `app/globals.css`);
every class starts with `k-`. Live specimen (dev only): **`/_kitchen-sink/kit`**.

Rules the kit already follows, so pages don't have to: every growable list is a searchable `Combobox`; 5 or fewer fixed
choices are `Segmented`; no native `<select>`, no ▾ glyph; admin controls 36px (`size="lg"` = student 44px);
"(optional)" instead of asterisks; Undo over "Are you sure?"; password re-auth only for deleting users, batches, roles,
published tests/results and sign-out-everywhere; toasts past tense; filters/sort/page in the URL; no drop shadows.

## Pickers (K01–K03)

```tsx
<Field label="Chapter" optional htmlFor="ch" error={err}>
  <Combobox id="ch" options={opts} value={v} onChange={(v, opt) => setV(v)} clearable noun="chapter"
    placeholder="Pick a chapter" invalid={!!err}
    creatable={{ label: (q) => `Create chapter "${q}" in Physics`, onCreate: add }}   // only chapters, topics, sources
    onSearch={(q) => setQ(q)} loading={isFetching} loadError={isError ? "Couldn't load chapters" : null} onRetry={refetch} />
</Field>
```
`ComboOption = { value, label, group?, end?, sub?, icon?, disabled?, keywords? }`. `disabled` + `disabledText` says why.
`MultiSelect` takes the same options plus `value: V[]`, `maxChips` (default 3, then "+N"), `creatable`, `chipLabel`.
`Segmented` = `{ options: [{value,label,count?}], value, onChange, ariaLabel, full?, size?: "sm"|"lg" }`.

Dates are IST: `DateTimeField` (UTC ISO value; quick picks, typing "15/11 9am", `minDate`, `readOnly`),
`DateField` ("YYYY-MM-DD"; `clearable`, `minDate`/`maxDate`), `BirthdayField` (day · month combobox · year),
`RangePanel` / `DateRangeChip` (`DateRange {from,to,preset}`, `presetRange("7d")`, `rangeInstants(r)` for API from/to).
Formatting helpers: `fmtDateTime`, `fmtDate`, `fmtRelative`, `istToday`, `fromIst`, `fmtPhone`, `inr`, `plural`.

## Forms (K09–K11, K14)

`Field` (label, `optional`, `hint`, `error`, `counter`, `group` for control groups), `TextInput` (`invalid`, `mono`,
`size`), `TextArea`, `PhoneInput` (fixed +91, value = 10 digits, `isPhone()`), `PasswordInput` (Show button; min 8 =
`MIN_PASSWORD`), `AffixInput` (prefix/suffix, `tone` plus/minus), `ReadOnlyValue` (lock), `ErrorSummary` (after a
failed Save: `fields=[{id,label}]`, takes focus, links jump to fields), `ServerErrorBanner` (amber, input kept),
`Checkbox` / `CheckBox`, `Switch` (takes effect at once), `RadioCards`. Numbers: `NumberStepper`, `SignedMarks`,
`RangeFields`. Upload: `FileDrop` (`accept`, `maxBytes`, `rules`, errors say the limit and the size; `checkFile`),
`FileRow` (progress / problem / failed). Wizards: `Steps` (`steps=[{label,bad?}]`, `current`, `onGo` for done steps).

## Overlays and confirmations (K06, K07)

`Drawer` (440px; `title`, `subtitle`, `leading`, `headerActions`, `belowHeader`, `footer`; `dirty` shows "Unsaved"
and turns Esc/scrim/× into an inline "Leave without saving?" footer). `KitDialog` (440 / `w500` / `wide` 560).
Confirm ladder:

```tsx
notify.undo("Removed Vikas Patel from Teacher", () => api.addBack())           // reversible: no dialog
<ConfirmDialog tone="danger" confirmLabel="Delete pattern" onConfirm={del} … />  // can't be undone
<ConfirmDialog tone="navy" facts={[["Scores","212 recalculated"]]} … />          // big but safe
<ReauthDialog title="Delete batch JEE 2027 · Indore B?" confirmLabel="Delete batch"
  onConfirm={(t) => apiUsers.delete(`/admin/batches/${id}`, withReauth(t))} secondary={…Archive instead…} />
<BlockedDialog title="Can't delete JEE Main yet" description="…closes on Wed 18 Nov." action={<Link …/>} />
<TypedConfirmDialog word="momentum" … />   <UnsavedChangesDialog onDiscard onSave />
```
`ReauthDialog` calls `POST /users/auth/reauth`, shows "That's not your password" / tries left / too many tries, then
passes the 5-minute token to `onConfirm`; send it with `withReauth(token)` (header `x-reauth-token`). Throwing from
`onConfirm` keeps the dialog open with the error.

## Feedback (K08, K16)

`notify.success(title, {description, action:{label, href|onClick}})` 4 s · `notify.undo(title, onUndo)` 6 s with a
ring · `notify.error(title, {description, retry})` stays · `notify.working(title)` → id, `notify.dismiss(id)`.
`<KitToaster/>` is mounted in `app/layout.tsx`. A sticky bottom bar calls `useToastLift(height)` (BulkBar does).
`Banner tone="mode|block|warn|info|ai" title=… action=… dismissKey=…` (only ai/info close); `InlineNote` inside cards.

## Lists (K04, K05) and page states (K13)

```tsx
const [s, set] = useUrlState({ q: "", batch: "", status: "active", page: "1", size: "25", sort: "name" });
<FilterBar activeCount={n} onClearAll={() => set({ batch: "", status: "active" })}
  search={<SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Name, email or phone" label="Search users" />}
  right={<span className="sm muted">…</span>}>
  <FilterChip label="Batch" noun="batch" options={…} value={s.batch || null} onChange={(v) => set({ batch: v ?? "" })} />
  <DateRangeChip value={range} onChange={…} isDefault={…} onReset={…} />
  <ToggleChip on={…} onChange={…}>Missing solution · 214</ToggleChip>
</FilterBar>
<DataTable ariaLabel="Students" status={q.isLoading ? "loading" : q.isError ? "error" : "ready"} rows={…} rowKey={(r) => r.id}
  columns={[{ key, header, width, align: "num", sortKey, tablet: "hide", render }]} onRowClick={open}
  selection={{ selected, onChange, label: (r) => r.name }} sort={{ key, dir, onSort }} rowMenu={(r) => [{ label, onSelect, danger? }]}
  filtered={!!s.q || n > 0} empty={<StateBox …/>} noMatch={<StateBox …/>} error={{ title: "Couldn't load students", code, onRetry }}
  footer={<Pagination page total pageSize onPage onPageSize sortLabel />} />
<BulkBar count={selected.size} onClear={…}>{…ghost buttons…}</BulkBar>
```
Changing a filter resets `page`; under 1180px the bar folds into "Filters · N" + a drawer.
**Tables fill the screen (owner rule, 6 Nov).** A page table takes the viewport height left below it and the page never
scrolls: page header, filters, the table's header row and the pagination stay put; only the body scrolls inside the
card (sticky header row, footer pinned under it), minimum 320px (≈ 6 rows) so only very short screens scroll the page.
`DataTable` does this by default (`fill`, `minHeight`; it keeps 80px clear while the bulk bar shows). Pass
`fill={false}` inside drawers and dialogs. A hand-made table (div grid) uses `useFillHeight(on, min, reserve)` → `[ref, height]`
on its card with an inner `overflow-y: auto` body and a sticky header row. Keep page content under a table out of the
way: whatever sits below it is measured and left visible. Page-level states:
`PageSkeleton` (after 300 ms, "Still loading…" at 10 s), `EmptyState` (one doodle), `PageError` (`what`, `code`),
`NoAccess` (`what`, `role`), `NotFoundState`, `OfflineBanner`, `StateBox` (inside cards/tables). Also `CopyCode`,
`Truncate` (tooltip only when cut), `RowMenu`, `apiError(e)` → `{status, code, message, details}`, `supportCode`.

LaTeX field (K12, Kit-Math): `MathField` in `math-field.tsx`, imported directly (`@/components/kit/math-field`, not
through this index: it brings KaTeX). Source with tinted $…$, live preview, toolbar + Greek/chemistry palettes, image
tokens with alt text/size, "needs LaTeX" flag with Convert with AI / Type it; `variant="inline"` for options and list
rows. Conversions and checks (`latexIssues`, `replaceImageWithLatex`, …) in `lib/latex-source.ts`.
Not in the kit: the ⌘K palette (K15, `components/admin/CommandPalette`).
Phone bottom sheets: drawers and dialogs become sheets under 640px; the admin app itself is 1024px+.
