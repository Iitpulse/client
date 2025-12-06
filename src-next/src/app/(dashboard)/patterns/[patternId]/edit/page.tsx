"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { IExam, ISubject, IPattern, ISection, ISubSection } from "@/types";

interface EditableSubSection {
  id: string;
  name: string;
  type: "single" | "multiple" | "integer" | "paragraph" | "matrix";
  noOfQuestions: number;
  toBeAttempted: number;
  marksPerQuestion: number;
  negativeMarks: number;
}

interface EditableSection {
  id: string;
  name: string;
  subject: string;
  subSections: EditableSubSection[];
}

const patternSchema = z.object({
  name: z.string().min(1, "Pattern name is required"),
  exam: z.string().optional(),
});

type PatternFormData = z.infer<typeof patternSchema>;

export default function EditPatternPage() {
  const router = useRouter();
  const params = useParams();
  const patternId = params.patternId as string;

  const [pattern, setPattern] = React.useState<IPattern | null>(null);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [sections, setSections] = React.useState<EditableSection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PatternFormData>({
    resolver: zodResolver(patternSchema),
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [patternRes, examsRes, subjectsRes] = await Promise.all([
          api.patterns.getById(patternId),
          api.exams.getAll(),
          api.subjects.getAll(),
        ]);

        const patternData = patternRes.data?.pattern;
        setPattern(patternData);
        setExams(examsRes.data?.exams || []);
        setSubjects(subjectsRes.data?.subjects || []);

        if (patternData) {
          reset({
            name: patternData.name,
            exam: typeof patternData.exam === "object"
              ? patternData.exam._id
              : patternData.exam,
          });

          // Convert sections to editable format
          const editableSections: EditableSection[] = patternData.sections.map(
            (section: ISection) => ({
              id: section.id,
              name: section.name,
              subject: section.subject || "",
              subSections: section.subSections.map((ss: ISubSection) => ({
                id: ss.id,
                name: ss.name,
                type: ss.type,
                noOfQuestions: ss.noOfQuestions || ss.totalQuestions || 0,
                toBeAttempted: ss.toBeAttempted || 0,
                marksPerQuestion: ss.marksPerQuestion || ss.markingScheme?.correct?.[0] || 4,
                negativeMarks: ss.markingScheme?.incorrect
                  ? Math.abs(ss.markingScheme.incorrect)
                  : 1,
              })),
            })
          );
          setSections(editableSections);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [patternId, reset]);

  const addSection = () => {
    const newSection: EditableSection = {
      id: `section-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      subject: "",
      subSections: [],
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof EditableSection, value: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, [field]: value } : s
      )
    );
  };

  const addSubSection = (sectionId: string) => {
    const newSubSection: EditableSubSection = {
      id: `subsection-${Date.now()}`,
      name: "New Subsection",
      type: "single",
      noOfQuestions: 5,
      toBeAttempted: 5,
      marksPerQuestion: 4,
      negativeMarks: 1,
    };

    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, subSections: [...s.subSections, newSubSection] }
          : s
      )
    );
  };

  const removeSubSection = (sectionId: string, subSectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subSections: s.subSections.filter((ss) => ss.id !== subSectionId),
            }
          : s
      )
    );
  };

  const updateSubSection = (
    sectionId: string,
    subSectionId: string,
    field: keyof EditableSubSection,
    value: string | number
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subSections: s.subSections.map((ss) =>
                ss.id === subSectionId ? { ...ss, [field]: value } : ss
              ),
            }
          : s
      )
    );
  };

  const onSubmit = async (data: PatternFormData) => {
    setLoading(true);
    try {
      const patternData = {
        id: patternId,
        name: data.name,
        exam: data.exam,
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          subject: s.subject,
          subSections: s.subSections.map((ss) => ({
            id: ss.id,
            name: ss.name,
            type: ss.type,
            noOfQuestions: ss.noOfQuestions,
            toBeAttempted: ss.toBeAttempted,
            markingScheme: {
              correct: [ss.marksPerQuestion],
              incorrect: -ss.negativeMarks,
            },
          })),
        })),
      };

      await api.patterns.update(patternData);
      router.push("/patterns");
    } catch (error) {
      console.error("Failed to update pattern:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading pattern...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patterns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Pattern</h1>
          <p className="text-muted-foreground">
            Update the pattern structure and marking scheme
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Pattern Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam">Exam Type</Label>
                <Select
                  defaultValue={
                    typeof pattern?.exam === "object"
                      ? pattern.exam._id
                      : pattern?.exam
                  }
                  onValueChange={(value) => setValue("exam", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Button type="button" onClick={addSection}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border bg-muted/30 p-4"
              >
                <div className="mb-4 flex items-center gap-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 grid gap-4 md:grid-cols-3">
                    <Input
                      value={section.name}
                      onChange={(e) =>
                        updateSection(section.id, "name", e.target.value)
                      }
                    />
                    <Select
                      value={section.subject}
                      onValueChange={(value) =>
                        updateSection(section.id, "subject", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject._id} value={subject._id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSubSection(section.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Subsection
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>

                {section.subSections.length > 0 && (
                  <div className="ml-8 space-y-3">
                    {section.subSections.map((subSection) => (
                      <div
                        key={subSection.id}
                        className="rounded-md border bg-background p-3"
                      >
                        <div className="grid gap-3 md:grid-cols-6">
                          <Input
                            value={subSection.name}
                            onChange={(e) =>
                              updateSubSection(
                                section.id,
                                subSection.id,
                                "name",
                                e.target.value
                              )
                            }
                          />
                          <Select
                            value={subSection.type}
                            onValueChange={(value) =>
                              updateSubSection(
                                section.id,
                                subSection.id,
                                "type",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">MCQ Single</SelectItem>
                              <SelectItem value="multiple">MCQ Multiple</SelectItem>
                              <SelectItem value="integer">Numerical</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={subSection.noOfQuestions}
                            onChange={(e) =>
                              updateSubSection(
                                section.id,
                                subSection.id,
                                "noOfQuestions",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <Input
                            type="number"
                            value={subSection.marksPerQuestion}
                            onChange={(e) =>
                              updateSubSection(
                                section.id,
                                subSection.id,
                                "marksPerQuestion",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <Input
                            type="number"
                            value={subSection.negativeMarks}
                            onChange={(e) =>
                              updateSubSection(
                                section.id,
                                subSection.id,
                                "negativeMarks",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeSubSection(section.id, subSection.id)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/patterns">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
