"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, XCircle, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { IPattern, ISection, ISubSection, IExam } from "@/types";

// Section Collapsible Component
function SectionCollapsible({
  section,
  sIndex,
  sectionQuestions,
  sectionAttempted,
  sectionMarks,
  getQuestionTypeLabel,
}: {
  section: ISection;
  sIndex: number;
  sectionQuestions: number;
  sectionAttempted: number;
  sectionMarks: number;
  getQuestionTypeLabel: (type: string) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                {sIndex + 1}
              </Badge>
              <span className="font-semibold">{section.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{sectionQuestions} questions</span>
                <span>{sectionAttempted} to attempt</span>
                <span>{sectionMarks} marks</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subsection</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">To Attempt</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Correct
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <XCircle className="h-3 w-3 text-red-600" />
                      Wrong
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Max Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.subSections?.map((ss: ISubSection) => {
                  const correctMarks = ss.markingScheme?.correct || [
                    ss.marksPerQuestion || 4,
                  ];
                  const incorrectMarks = ss.markingScheme?.incorrect ?? -1;
                  const questions = ss.noOfQuestions || ss.totalQuestions || 0;
                  const maxMarks = questions * (correctMarks[0] || 0);

                  return (
                    <TableRow key={ss.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ss.name}</div>
                          {ss.description && (
                            <div className="text-xs text-muted-foreground">
                              {ss.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getQuestionTypeLabel(ss.type)}
                        </Badge>
                        {ss.type === "paragraph" && ss.paragraphType && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            ({getQuestionTypeLabel(ss.paragraphType)})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{questions}</TableCell>
                      <TableCell className="text-center">
                        {ss.toBeAttempted || questions}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600">
                          +{correctMarks.join(", +")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600">{incorrectMarks}</span>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {maxMarks}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function PatternPreviewPage() {
  const params = useParams();
  const patternId = params.patternId as string;

  const [pattern, setPattern] = React.useState<IPattern | null>(null);
  const [examsMap, setExamsMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [patternRes, examsRes] = await Promise.all([
          api.patterns.getById(patternId),
          api.exams.getAll(),
        ]);

        const data = patternRes.data?.pattern || patternRes.data?.data;
        setPattern(data);

        // Build exam ID -> name lookup map
        const examsList: IExam[] = examsRes.data?.data || examsRes.data?.exams || examsRes.data || [];
        const examLookup: Record<string, string> = {};
        examsList.forEach((exam) => {
          if (exam._id) {
            examLookup[exam._id] = exam.name;
          }
        });
        setExamsMap(examLookup);
      } catch (error) {
        console.error("Failed to fetch pattern:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patternId]);

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: "MCQ Single",
      multiple: "MCQ Multiple",
      integer: "Numerical",
      paragraph: "Paragraph",
      matrix: "Matrix Match",
    };
    return labels[type] || type;
  };

  const getTotalQuestions = () => {
    if (!pattern?.sections) return 0;
    return pattern.sections.reduce((total, section) => {
      return (
        total +
        (section.subSections?.reduce(
          (subTotal, ss) => subTotal + (ss.noOfQuestions || ss.totalQuestions || 0),
          0
        ) || 0)
      );
    }, 0);
  };

  const getTotalMarks = () => {
    if (!pattern?.sections) return 0;
    return pattern.sections.reduce((total, section) => {
      return (
        total +
        (section.subSections?.reduce((subTotal, ss) => {
          const questions = ss.noOfQuestions || ss.totalQuestions || 0;
          const marks =
            ss.marksPerQuestion ||
            (ss.markingScheme?.correct?.[0]) ||
            0;
          return subTotal + questions * marks;
        }, 0) || 0)
      );
    }, 0);
  };

  const getToBeAttempted = () => {
    if (!pattern?.sections) return 0;
    return pattern.sections.reduce((total, section) => {
      return (
        total +
        (section.subSections?.reduce(
          (subTotal, ss) =>
            subTotal + (ss.toBeAttempted || ss.noOfQuestions || ss.totalQuestions || 0),
          0
        ) || 0)
      );
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading pattern...</div>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Pattern not found</div>
      </div>
    );
  }

  // Get exam name - could be object (populated), ID string, or name string
  const getExamName = () => {
    const exam = pattern.exam;
    if (typeof exam === "object" && exam?.name) {
      return exam.name;
    }
    if (typeof exam === "string" && exam) {
      // Look up exam name from examsMap using the exam ID
      return examsMap[exam] || "-";
    }
    return "-";
  };
  const examName = getExamName();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patterns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{pattern.name}</h1>
          <p className="text-muted-foreground">Pattern Preview</p>
        </div>
        <Button asChild>
          <Link href={`/patterns/${patternId}/edit`}>Edit Pattern</Link>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exam Type</CardDescription>
            <CardTitle className="text-xl">{examName || "-"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-4 w-4" />
              {formatDuration(pattern.durationInMinutes)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Questions</CardDescription>
            <CardTitle className="text-xl">{getTotalQuestions()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>To Be Attempted</CardDescription>
            <CardTitle className="text-xl">{getToBeAttempted()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Marks</CardDescription>
            <CardTitle className="text-xl">{getTotalMarks()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Sections ({pattern.sections?.length || 0})</CardTitle>
          <CardDescription>
            Detailed breakdown of pattern structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pattern.sections?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No sections defined
            </div>
          ) : (
            <div className="space-y-3">
              {pattern.sections?.map((section: ISection, sIndex: number) => {
                const sectionQuestions =
                  section.subSections?.reduce(
                    (sum, ss) => sum + (ss.noOfQuestions || ss.totalQuestions || 0),
                    0
                  ) || 0;
                const sectionAttempted =
                  section.subSections?.reduce(
                    (sum, ss) =>
                      sum + (ss.toBeAttempted || ss.noOfQuestions || ss.totalQuestions || 0),
                    0
                  ) || 0;
                const sectionMarks =
                  section.subSections?.reduce((sum, ss) => {
                    const questions = ss.noOfQuestions || ss.totalQuestions || 0;
                    const marks =
                      ss.marksPerQuestion || ss.markingScheme?.correct?.[0] || 0;
                    return sum + questions * marks;
                  }, 0) || 0;

                return (
                  <SectionCollapsible
                    key={section.id}
                    section={section}
                    sIndex={sIndex}
                    sectionQuestions={sectionQuestions}
                    sectionAttempted={sectionAttempted}
                    sectionMarks={sectionMarks}
                    getQuestionTypeLabel={getQuestionTypeLabel}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Created At</div>
              <div className="font-medium">
                {pattern.createdAt
                  ? new Date(pattern.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created By</div>
              <div className="font-medium">
                {pattern.createdBy?.userType
                  ? pattern.createdBy.userType.toUpperCase()
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Modified</div>
              <div className="font-medium">
                {pattern.modifiedAt
                  ? new Date(pattern.modifiedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
