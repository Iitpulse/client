"use client";

/*
  Admin-Tests "Student links" drawer (states links, links-email, links-empty): one personal sign-in link per student
  of a batch (GET/POST /users/admin/test-links), "Email links" (POST …/email; students who already started are
  skipped by the server), copy all for WhatsApp and .csv built here from the list, "New link" per student (renew:
  the old one stops at once). Opening it again makes links for students added since (POST makes only missing ones).
*/
import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox, Drawer, Field, RowMenu, StateBox, notify } from "@/components/kit";
import { apiError } from "@/lib/m6/client";
import { istDateTime } from "@/lib/m6/shared";
import { linksActions, linksCopyText, linksCsv, useTestLinks } from "@/lib/m6/tests";
import type { Ref } from "@/lib/m6-contract";
import { useQueryClient } from "@tanstack/react-query";

const errorToast = (title: string, e: unknown) => notify.error(title, { description: apiError(e).message });

export interface LinksTest {
  testId: string;
  name: string;
  opensAt: string | null;
  batches: Ref[];
}

export function TestLinksDrawer({ test, onClose }: { test: LinksTest | null; onClose: () => void }) {
  if (!test) return null;
  return <LinksDrawerBody key={test.testId} test={test} onClose={onClose} />;
}

function shortUrl(url: string) {
  const m = url.match(/\/t\/([^/?#]+)/);
  return m ? `…/t/${m[1]}` : url.replace(/^https?:\/\/[^/]+/, "…");
}

function LinksDrawerBody({ test, onClose }: { test: LinksTest; onClose: () => void }) {
  const [batchId, setBatchId] = useState<string | null>(test.batches[0]?.id ?? null);
  const links = useTestLinks(test.testId, batchId);
  const qc = useQueryClient();
  const toast = (title: string) => notify.success(title);
  const [busy, setBusy] = useState<string | null>(null);
  const [emailAsk, setEmailAsk] = useState(false);
  const autoMade = useRef<string | null>(null);
  const l = links.data;
  const made = !!l && l.counts.links > 0;

  const put = (data: typeof l) => qc.setQueryData(["m6", "tests", "links", test.testId, batchId], data);
  const make = async (silent = false) => {
    if (!batchId) return;
    setBusy("make");
    try {
      const r = await linksActions.make(test.testId, batchId);
      const added = r.counts.links - (l?.counts.links ?? 0);
      put(r);
      qc.invalidateQueries({ queryKey: ["m6", "tests", "list"] });
      if (!silent || added > 0) toast(silent ? `Made ${added} new ${added === 1 ? "link" : "links"} for students added since` : `Made ${r.counts.links.toLocaleString("en-IN")} links`);
    } catch (e) {
      errorToast("Couldn't make the links", e);
    } finally {
      setBusy(null);
    }
  };
  // new students in the batch get a link when the drawer opens again
  useEffect(() => {
    if (l && l.counts.links > 0 && l.counts.studentsWithoutLink > 0 && autoMade.current !== batchId) {
      autoMade.current = batchId;
      void make(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l, batchId]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      errorToast("Couldn't copy", new Error("Your browser blocked the clipboard. Select the text and copy it instead."));
    }
  };
  const csv = () => {
    if (!l) return;
    const blob = new Blob([linksCsv(l)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${test.name} - ${l.batch.name} - links.csv`.replace(/[\\/:*?"<>|]/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const email = async () => {
    if (!batchId) return;
    setBusy("email");
    try {
      const r = await linksActions.email(test.testId, batchId);
      setEmailAsk(false);
      const skipped = r.skippedNoEmail + r.skippedRemoved;
      toast(`Emailed ${r.sent.toLocaleString("en-IN")} ${r.sent === 1 ? "link" : "links"}${skipped ? ` · ${skipped} had no email` : ""}`);
    } catch (e) {
      errorToast("Couldn't send the emails", e);
    } finally {
      setBusy(null);
    }
  };
  const renew = async (studentId: string, name: string) => {
    setBusy(studentId);
    try {
      const row = await linksActions.renew(test.testId, studentId);
      if (l) put({ ...l, items: l.items.map((r) => (r.student.id === studentId ? row : r)) });
      await copy(row.url, `New link for ${name} copied · the old one stopped working`);
    } catch (e) {
      errorToast("Couldn't make a new link", e);
    } finally {
      setBusy(null);
    }
  };

  const batchOptions = useMemo(() => test.batches.map((b) => ({ value: b.id, label: b.name })), [test.batches]);
  const err = links.isError ? apiError(links.error) : null;

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      aria-label={`Student links for ${test.name}`}
      title="Student links"
      subtitle={`${test.name}${test.opensAt ? ` · opens ${istDateTime(test.opensAt)}` : ""}`}
      footer={
        <>
          <span className="xs muted mr-auto self-center">New students in the batch get a link when you open this again.</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <span className="sm">Each student gets their own link. It signs them in and opens this test. Nobody else can use it.</span>
      {!test.batches.length ? (
        <div className="col items-center gap-1.5 rounded-xl border border-dashed border-line px-6 py-6 text-center">
          <span className="sm font-semibold">This test has no batches yet</span>
          <span className="xs muted">Pick batches in the test&apos;s settings, then make the links here.</span>
        </div>
      ) : (
        <>
          <Field label="Batch" htmlFor="links-batch" hint={l?.expiresAt ? `Links stop working when the test closes, ${istDateTime(l.expiresAt)}.` : "Links stop working when the test closes."}>
            <div className="row gap-2">
              <Combobox id="links-batch" value={batchId} onChange={(v) => v && setBatchId(v)} options={batchOptions} noun="batch" className="grow" />
              {l && !made && (
                <button type="button" className="btn btn-primary btn-sm h-9 shrink-0" onClick={() => make()} disabled={busy === "make"}>
                  Make {l.counts.studentsWithoutLink.toLocaleString("en-IN")} links
                </button>
              )}
            </div>
          </Field>

          {links.isLoading && (
            <div className="col gap-2" aria-busy="true">
              <div className="skel h-4 w-1/2" />
              <div className="skel h-40 rounded-xl" />
            </div>
          )}
          {err && (
            <StateBox
              compact
              tone="error"
              title="Couldn't load the links"
              body={err.message}
              code={err.code ?? undefined}
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => links.refetch()}>
                  Try again
                </button>
              }
            />
          )}

          {l && !made && (
            <div className="col min-h-[140px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D3D6E2] p-6 text-center">
              <span className="sm font-semibold">No links for this batch yet</span>
              <span className="xs muted">Make them, then share on WhatsApp or by email.</span>
            </div>
          )}

          {l && made && (
            <>
              <div className="row between wrap gap-2">
                <span className="xs muted num">
                  {l.counts.links.toLocaleString("en-IN")} links · {l.counts.opened.toLocaleString("en-IN")} opened
                  {l.madeAt ? ` · made ${istDateTime(l.madeAt).replace(/^\w+ /, "")}` : ""}
                </span>
                <span className="row gap-1.5">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEmailAsk(true)} aria-expanded={emailAsk}>
                    Email links
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy(linksCopyText(l), "Copied for WhatsApp")}>
                    Copy all for WhatsApp
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={csv}>
                    Download .csv
                  </button>
                </span>
              </div>
              {emailAsk && (
                <div className="col gap-2.5 rounded-xl border border-brand-200 bg-[#F8F9FE] px-3.5 py-3" role="group" aria-label="Email links">
                  <span className="sm font-semibold">Email each student their own link?</span>
                  <span className="xs leading-normal text-ink-2">
                    Students of {l.batch.name} with an email address get the &quot;Your link for {test.name}&quot; email from tests@iitpulse.in. Students without one are
                    counted after sending: share theirs on WhatsApp. Students who already started the test don&apos;t get it.
                  </span>
                  <span className="row gap-1.5">
                    <button type="button" className="btn btn-primary btn-sm" onClick={email} disabled={busy === "email"}>
                      Send {l.counts.links.toLocaleString("en-IN")} emails
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEmailAsk(false)}>
                      Cancel
                    </button>
                  </span>
                </div>
              )}
              <div className="card overflow-hidden">
                <table className="table table-fixed">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th className="w-[118px]">Link</th>
                      <th className="num w-[64px]">Opened</th>
                      <th className="w-[96px]">
                        <span className="sr-only">Copy</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.items.map((r) => (
                      <tr key={r.student.id}>
                        <td>
                          <span className="col gap-0">
                            <span className="sm truncate font-semibold">{r.student.name}</span>
                            <span className="xs muted truncate">{r.student.phone ?? "no phone"}</span>
                          </span>
                        </td>
                        <td className="truncate font-mono text-xs font-medium text-ink-2" title={r.url}>
                          {shortUrl(r.url)}
                        </td>
                        <td className={`num sm ${r.opens ? "" : "muted"}`} title={r.lastOpenedAt ? `Last opened ${istDateTime(r.lastOpenedAt)}` : undefined}>
                          {r.opens || "—"}
                        </td>
                        <td>
                          <span className="row justify-end gap-0.5">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(r.url, `Copied ${r.student.name}'s link`)} aria-label={`Copy ${r.student.name}'s link`}>
                              Copy
                            </button>
                            <RowMenu label={`More for ${r.student.name}`} items={[{ label: "New link", onSelect: () => renew(r.student.id, r.student.name), disabled: busy === r.student.id }]} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className="xs muted">A lost phone? Use &quot;New link&quot; in a student&apos;s row menu: the old one stops working at once.</span>
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
