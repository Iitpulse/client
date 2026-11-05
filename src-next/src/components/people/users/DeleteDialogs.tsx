"use client";
/*
  Admin-Users delete family (owner, 5 Nov): students "Deactivate & anonymise" (scores stay as "Removed student");
  teachers/staff "Deactivate" (+ "Anonymise" on request); "Erase everything" for privacy requests only. All need the
  password (x-reauth-token). The impact comes from GET …/delete-impact (attempts, writing now).
*/
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { ReauthDialog, apiError, notify, plural } from "@/components/kit";
import type { UserDetail } from "@/lib/m6-contract";
import { usersApi } from "@/lib/m6/people";
import { pron } from "./shared";

export type DeleteKind = "delete" | "anonymise" | "erase";

export function UserDeleteDialogs({
  user,
  kind,
  onKind,
  onClose,
  onDone,
}: {
  user: UserDetail | null;
  kind: DeleteKind | null;
  onKind: (k: DeleteKind) => void;
  onClose: () => void;
  onDone: (action: "deactivated" | "anonymised" | "erased", u: UserDetail) => void;
}) {
  const impact = useQuery({ queryKey: ["m6", "people", "impact", user?.id], enabled: !!user && !!kind, queryFn: () => usersApi.impact(user!.id), retry: false });
  if (!user) return null;
  const p = pron(user.gender);
  const student = user.type === "student";
  const attempts = impact.data?.attempts;
  const writing = impact.data?.writingNow ?? [];
  const writingNote =
    writing.length > 0 ? (
      <div className="k-note warn" role="note">
        <TriangleAlert className="size-4" aria-hidden />
        <span>
          <b>{user.name} is writing {writing.map((t) => t.name).join(", ")} now.</b> This works after {p.he} submits.
        </span>
      </div>
    ) : null;
  const run = async (fn: () => Promise<{ action: "deactivated" | "anonymised" | "erased" }>) => {
    try {
      const r = await fn();
      onDone(r.action, user);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "STUDENT_WRITING") throw new Error(`${user.name} is writing a test now. Try again after ${p.he} submits.`);
      throw e;
    }
  };
  const label = student ? "student" : user.type === "teacher" ? "teacher" : "person";
  return (
    <>
      <ReauthDialog
        open={kind === "delete" && student}
        onOpenChange={(o) => !o && onClose()}
        width="w500"
        title={`Deactivate and anonymise ${user.name}?`}
        description={`Use this when a student leaves. ${p.His} scores stay in your results.`}
        confirmLabel="Deactivate & anonymise"
        onConfirm={(t) => run(() => usersApi.remove(user.id, t))}
        footnote={
          <>
            A privacy request to delete everything?{" "}
            <button type="button" className="k-linkbtn" onClick={() => onKind("erase")}>
              Erase everything instead
            </button>
          </>
        }
      >
        {writingNote}
        <ul className="k-dl-list">
          <li>{p.He} can&rsquo;t sign in, and {p.his} test links stop working.</li>
          <li>
            {p.His} name shows as <b>Removed student</b> everywhere. Email, phone, date of birth, address, school and parent details are erased.
          </li>
          <li>{attempts != null ? `${p.His} ${plural(attempts, "test attempt")} and scores stay` : `${p.His} test attempts and scores stay`} in ranks, averages and question statistics.</li>
          <li>This can&rsquo;t be undone. To only stop sign-in for now, set {p.his} Status to Deactivated in Edit.</li>
        </ul>
      </ReauthDialog>
      <ReauthDialog
        open={kind === "delete" && !student}
        onOpenChange={(o) => !o && onClose()}
        width="w500"
        title={`Deactivate ${user.name}?`}
        description={`${p.He === "They" ? "They" : p.He} can't sign in from now on. ${p.His} questions, tests and roles stay, and you can make ${p.him} active again from Edit.`}
        confirmLabel="Deactivate"
        onConfirm={(t) => run(() => usersApi.remove(user.id, t))}
        footnote={
          <>
            {p.He} asked to remove {p.his} details?{" "}
            <button type="button" className="k-linkbtn" onClick={() => onKind("anonymise")}>
              Anonymise
            </button>{" "}
            · Privacy request?{" "}
            <button type="button" className="k-linkbtn" onClick={() => onKind("erase")}>
              Erase everything
            </button>
          </>
        }
      />
      <ReauthDialog
        open={kind === "anonymise"}
        onOpenChange={(o) => !o && onClose()}
        width="w500"
        title={`Anonymise ${user.name}?`}
        description={`Only when ${p.he} asks for it. ${p.He} stays deactivated.`}
        confirmLabel="Anonymise"
        onConfirm={(t) => run(() => usersApi.anonymise(user.id, t))}
      >
        <ul className="k-dl-list">
          <li>
            {p.His} name shows as <b>Removed {label}</b> on questions, tests and in the audit log.
          </li>
          <li>Email, phone, address{user.type === "teacher" ? " and subjects" : ""} are erased.</li>
          <li>{p.His} questions and tests stay. This can&rsquo;t be undone.</li>
        </ul>
      </ReauthDialog>
      <ReauthDialog
        open={kind === "erase"}
        onOpenChange={(o) => !o && onClose()}
        width="wide"
        title={`Erase everything for ${user.name}?`}
        description={`For privacy requests only. Most of the time, ${student ? "Deactivate & anonymise" : "Deactivate"} is what you want.`}
        confirmLabel="Erase everything"
        onConfirm={(t) => run(() => usersApi.erase(user.id, t))}
      >
        {writingNote}
        <div className="k-warnbox" role="note">
          <TriangleAlert className="size-4" aria-hidden />
          <span>
            <b>This deletes {p.him} for good.</b>{" "}
            {student
              ? `${p.His} account, ${attempts != null ? `all ${plural(attempts, "test attempt")}` : "all test attempts"}, answers and scores, practice, doubts and AI reviews are deleted. Ranks and averages are worked out again without ${p.him}.`
              : `${p.His} account and personal details are deleted.`}{" "}
            Nobody can bring any of it back, including us.
          </span>
        </div>
        <span className="xs muted">The audit log records that an account was erased, by you, with no personal details.</span>
      </ReauthDialog>
    </>
  );
}

export function deleteToast(action: "deactivated" | "anonymised" | "erased", u: UserDetail) {
  if (action === "erased") notify.success("Account erased", { description: "Tests and AI data are removed in the background" });
  else if (action === "anonymised") notify.success(`${u.type === "student" ? "Student" : "Account"} anonymised`, { description: "Shows as Removed student" });
  else notify.success(`${u.name} deactivated`);
}
