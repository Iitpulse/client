"use client";
// Kitchen sink, part 3: the admin's shadcn primitives (new-york, restyled through @iitpulse/ui tokens) on the
// admin surface, for review next to the Main board. No legacy scope here: this is what migrated pages get.
import { useState, type ReactNode } from "react";
import { Paper } from "@iitpulse/ui";
import { MathText } from "@/components/math-text";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import RenderWithLatex from "@/components/render-with-latex";

const VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const BADGES = ["default", "secondary", "success", "warning", "destructive", "outline", "live", "sky"] as const;

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="h2">{title}</h2>
        <p className="sm muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

// Real question-bank shapes: MathType's inline \[…\], $…$, mhchem, and a Hindi stem with maths.
const SAMPLE_EN =
  "<p>When 400 ml of 0.2 M acetic acid is mixed with 800 ml of 0.5 M \\[NaOH\\] solution, \\[4.416\\,\\,KJ\\] of heat is liberated. If $\\Delta H = -\\frac{q}{n}$, find $y$ for \\(\\ce{CH3COOH + NaOH -> CH3COONa + H2O}\\).</p><p>$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$</p>";
const SAMPLE_HI =
  "<p>एक कण का वेग \\[v = 3{{t}^{2}} + 2t\\] m/s है। समय $t = 2$ s पर त्वरण ज्ञात कीजिए।</p>";

export function Primitives() {
  const { toast } = useToast();
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);

  return (
    <Paper surface="admin" className="min-h-screen">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-8 py-12 text-ink">
        <header className="flex flex-col gap-2">
          <span className="eyebrow">Kitchen sink · admin primitives</span>
          <h1 className="h1">shadcn primitives on the IIT-PULSE tokens</h1>
          <p className="body muted">
            new-york components, restyled from the Main board: 36px controls, 10px field radius, no shadows, 3px Navy 200 focus.
            Boards: <a href="?board=main">Main</a> · <a href="?board=motion">Motion</a>
          </p>
        </header>

        <Section title="Buttons" note="default = .btn-primary, outline = .btn-secondary, ghost = .btn-ghost, destructive = .btn-danger.">
          <div className="flex flex-wrap items-center gap-3">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {v === "default" ? (
                  <>
                    Publish test <ArrowRight />
                  </>
                ) : (
                  v
                )}
              </Button>
            ))}
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button variant="outline" size="icon" aria-label="Search">
              <Search />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Delete">
              <Trash2 />
            </Button>
            <Button variant="secondary" size="sm">
              <Plus /> Add question
            </Button>
          </div>
        </Section>

        <Section title="Badges" note="Board tints: navy, grey, green, amber, red, sky; outline for neutral tags.">
          <div className="flex flex-wrap items-center gap-2">
            {BADGES.map((b) => (
              <Badge key={b} variant={b}>
                {b === "live" ? (
                  <>
                    <span className="live-dot" /> Live now
                  </>
                ) : (
                  b
                )}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Fields" note="36px inputs and selects; invalid fields get a Red 600 border and a Red 50 outline.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ks-email">Email</Label>
              <Input id="ks-email" placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ks-code">Batch code</Label>
              <Input id="ks-code" defaultValue="IIT20" aria-invalid />
              <span className="hint" style={{ color: "var(--red-600)" }}>
                No batch with this code
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select defaultValue="physics">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="maths">Mathematics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="ks-notes">Instructions</Label>
              <Textarea id="ks-notes" placeholder="Shown to students before the test starts" />
            </div>
            <div className="flex flex-col justify-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /> Shuffle questions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={on} onCheckedChange={setOn} /> Show result after submit
              </label>
            </div>
          </div>
        </Section>

        <Section title="Tabs" note="default = the segmented control (.seg/.tab), line = underline tabs (.utab).">
          <div className="flex flex-wrap items-start gap-10">
            <Tabs defaultValue="mcq">
              <TabsList>
                <TabsTrigger value="mcq">MCQ</TabsTrigger>
                <TabsTrigger value="num">Numerical</TabsTrigger>
                <TabsTrigger value="para">Paragraph</TabsTrigger>
              </TabsList>
              <TabsContent value="mcq" className="sm muted">
                Single and multiple correct.
              </TabsContent>
            </Tabs>
            <Tabs defaultValue="en">
              <TabsList variant="line">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="hi">Hindi</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Section>

        <Section title="Card, table, overlays" note="Cards and tables carry no shadow; overlays sit on an ink scrim.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">JEE Main mock 4</CardTitle>
                <CardDescription>75 questions · 180 min · Indore</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Progress value={64} />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Open dialog
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Publish this test?</DialogTitle>
                        <DialogDescription>Students in the batch see it at the start time.</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Publish</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Menu
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Test</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="secondary" size="sm" onClick={() => toast({ title: "Saved", description: "The question is in the bank." })}>
                    Toast
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Student 1", "JEE 2027 A", "212"],
                    ["Student 2", "JEE 2027 A", "198"],
                    ["Student 3", "NEET 2027", "176"],
                  ].map(([n, b, s]) => (
                    <TableRow key={n}>
                      <TableCell className="font-medium">{n}</TableCell>
                      <TableCell>{b}</TableCell>
                      <TableCell className="num text-right">{s}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </Section>

        <Section title="Question preview" note="MathText (KaTeX 0.19, mhchem), the renderer behind every admin question preview. LaTeX stays text.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="p-5">
              <RenderWithLatex quillString={SAMPLE_EN} />
            </Card>
            <Card className="p-5" lang="hi">
              <RenderWithLatex quillString={SAMPLE_HI} />
            </Card>
          </div>
          <p className="sm muted">
            <MathText>{"Inline in plain text: $E = mc^2$, and prices stay text: $5 and $10."}</MathText>
          </p>
        </Section>
      </div>
    </Paper>
  );
}
