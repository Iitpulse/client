"use client";

import * as React from "react";
import { Copy, Download, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface KeyRow {
  studentId: string;
  name: string;
  email: string;
  key: string;
  expiresAt: string;
  useCount?: number;
  lastUsedAt?: string;
}

/**
 * Per-student single-sign-on links for a test: the users service issues one access key per
 * student and the test portal exchanges it for a session at /auth/<key>/<testId>.
 */
export function StudentAccessLinks({ testId, batches, validTo }: { testId: string; batches: Array<{ id: string; name: string }>; validTo?: string }) {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<KeyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState<string | null>(null);
  const portal = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "http://localhost:3001";
  const linkFor = (key: string) => `${portal}/auth/${key}/${testId}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.users.listTestKeys(testId);
      setRows(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load access keys:", error);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const generate = async (batchId: string, batchName: string) => {
    setGenerating(batchId);
    try {
      const res = await api.users.generateTestKeys({ testId, batchId, expiresAt: validTo });
      toast({ title: "Links ready", description: `${res.data?.data?.length ?? 0} student link(s) for ${batchName}. Existing links were kept.` });
      await load();
    } catch (error: unknown) {
      const errData = (error as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data;
      toast({ title: "Could not generate links", description: errData?.error?.message || errData?.message || "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: what });
    } catch {
      toast({ title: "Copy failed", description: "Select the text and copy it manually.", variant: "destructive" });
    }
  };

  const downloadCsv = () => {
    const header = "Name,Email,Key,Link,Expires";
    const lines = rows.map((r) => [r.name, r.email, r.key, linkFor(r.key), r.expiresAt].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-links-${testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Student access links
        </CardTitle>
        <CardDescription>
          Each link signs one student straight into this test on the portal. Generate them per batch, then copy or download the list to share.
          Links stop working when the test's validity ends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {batches.length === 0 && <p className="text-sm text-muted-foreground">This test has no batches yet.</p>}
          {batches.map((b) => (
            <Button key={b.id} variant="outline" size="sm" disabled={generating === b.id} onClick={() => generate(b.id, b.name)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${generating === b.id ? "animate-spin" : ""}`} />
              Generate for {b.name}
            </Button>
          ))}
          {rows.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={() => copy(rows.map((r) => `${r.name} <${r.email}>: ${linkFor(r.key)}`).join("\n"), `${rows.length} links`)}>
                <Copy className="h-4 w-4 mr-2" /> Copy all links
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-2" /> Download CSV
              </Button>
            </>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No links yet. Generate them for a batch above.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Student</th>
                  <th className="p-2">Key</th>
                  <th className="p-2">Link</th>
                  <th className="p-2">Used</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{r.name || r.studentId}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="p-2 font-mono">{r.key}</td>
                    <td className="p-2 font-mono text-xs max-w-[320px] truncate" title={linkFor(r.key)}>
                      {linkFor(r.key)}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{r.useCount ? `${r.useCount}× ${r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString() : ""}` : "never"}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => copy(linkFor(r.key), `Link for ${r.name || r.email}`)} title="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
