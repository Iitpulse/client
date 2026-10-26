"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { ISection, ISubSection, IQuestion } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";
import { StudentAccessLinks } from "@/components/student-access-links";

interface TestSection extends ISection {
  subSections: TestSubSection[];
}

interface TestSubSection extends ISubSection {
  questions?: IQuestion[];
  totalQuestions?: number;
  toBeAttempted?: number;
}

interface TestData {
  _id: string;
  name: string;
  description?: string;
  durationInMinutes: number;
  sections: TestSection[];
  batches?: Array<{ id: string; name: string }>;
  status: string;
  validity?: {
    from: string;
    to: string;
  };
}

export default function TestPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  const { toast } = useToast();

  const [test, setTest] = React.useState<TestData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<"overview" | "questions">("overview");

  // Flatten questions for navigation
  const allQuestions = React.useMemo(() => {
    if (!test) return [];
    const questions: Array<{
      question: IQuestion;
      sectionName: string;
      sectionSubject?: string;
      subSectionName: string;
      type: string;
      index: number;
    }> = [];
    let idx = 0;
    test.sections.forEach((section) => {
      section.subSections.forEach((subSection) => {
        (subSection.questions || []).forEach((q) => {
          questions.push({
            question: q,
            sectionName: section.name,
            sectionSubject: section.subject,
            subSectionName: subSection.name,
            type: subSection.type,
            index: idx++,
          });
        });
      });
    });
    return questions;
  }, [test]);

  React.useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const response = await api.tests.getById(testId);
        const testData = response.data?.data || response.data;
        setTest(testData);
        // Expand first section by default
        if (testData?.sections?.length > 0) {
          setExpandedSections({ [testData.sections[0].id]: true });
        }
      } catch (error) {
        console.error("Failed to fetch test:", error);
        toast({
          title: "Error",
          description: "Failed to load test",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      fetchTest();
    }
  }, [testId, toast]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const currentQuestion = allQuestions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Test not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Test Preview
            </h1>
            <p className="text-muted-foreground">{test.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {test.durationInMinutes} min
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {test.batches?.length || 0} batches
          </Badge>
          <Badge variant={test.status === "draft" ? "secondary" : "default"}>
            {test.status}
          </Badge>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question-by-Question</TabsTrigger>
          <TabsTrigger value="links">Student links</TabsTrigger>
        </TabsList>

        {/* Overview Mode */}
        <TabsContent value="overview" className="space-y-4">
          {test.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          <div className="space-y-4">
            {test.sections.map((section, sectionIdx) => (
              <Card key={section.id}>
                <Collapsible
                  open={expandedSections[section.id]}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            Section {sectionIdx + 1}: {section.name}
                            {section.subject && (
                              <Badge variant="outline">{section.subject}</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {section.subSections.length} subsection(s),{" "}
                            {section.subSections.reduce(
                              (acc, ss) => acc + (ss.questions?.length || 0),
                              0
                            )}{" "}
                            question(s)
                          </CardDescription>
                        </div>
                        {expandedSections[section.id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {section.subSections.map((subSection, ssIdx) => (
                        <div
                          key={subSection.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{subSection.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Type: {subSection.type} | Questions:{" "}
                                {subSection.questions?.length || 0}
                                {subSection.toBeAttempted &&
                                  subSection.toBeAttempted <
                                    (subSection.questions?.length || 0) && (
                                    <span className="ml-2">
                                      (Attempt {subSection.toBeAttempted})
                                    </span>
                                  )}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              +{subSection.markingScheme?.correct?.[0] || 4} / -
                              {Math.abs(subSection.markingScheme?.incorrect || 1)}
                            </Badge>
                          </div>

                          {/* Questions Preview */}
                          <div className="space-y-2 mt-3">
                            {(subSection.questions || []).map((q, qIdx) => (
                              <div
                                key={q._id}
                                className="p-3 bg-muted/30 rounded border text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-medium text-muted-foreground">
                                    Q{qIdx + 1}.
                                  </span>
                                  <div className="flex-1">
                                    <RenderWithLatex
                                      quillString={
                                        q.en?.question || q.question || ""
                                      }
                                    />
                                    {/* Options for MCQ */}
                                    {(subSection.type === "single" ||
                                      subSection.type === "multiple") && (
                                      <div className="mt-2 space-y-1 pl-4">
                                        {((q.en as { options?: Array<{ id: string; value: string }> })?.options ||
                                          (q as { options?: Array<{ id: string; value?: string; en?: { value: string } }> }).options ||
                                          []).map(
                                          (
                                            opt: { id: string; value?: string; en?: { value: string } },
                                            optIdx: number
                                          ) => (
                                            <div
                                              key={opt.id}
                                              className="flex items-start gap-2"
                                            >
                                              <span className="text-muted-foreground">
                                                {String.fromCharCode(65 + optIdx)}.
                                              </span>
                                              <RenderWithLatex
                                                quillString={
                                                  opt.value || opt.en?.value || ""
                                                }
                                              />
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Question-by-Question Mode */}
        <TabsContent value="questions" className="space-y-4">
          {allQuestions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Question Display */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Question {currentQuestionIndex + 1} of{" "}
                          {allQuestions.length}
                        </CardTitle>
                        <CardDescription>
                          {currentQuestion?.sectionSubject ||
                            currentQuestion?.sectionName}{" "}
                          - {currentQuestion?.subSectionName}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          currentQuestion?.type === "single"
                            ? "default"
                            : currentQuestion?.type === "multiple"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {currentQuestion?.type === "single"
                          ? "Single Choice"
                          : currentQuestion?.type === "multiple"
                          ? "Multiple Choice"
                          : "Numerical"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentQuestion && (
                      <div className="space-y-4">
                        <div className="prose max-w-none">
                          <RenderWithLatex
                            quillString={
                              currentQuestion.question.en?.question ||
                              currentQuestion.question.question ||
                              ""
                            }
                          />
                        </div>

                        {/* Options for MCQ */}
                        {(currentQuestion.type === "single" ||
                          currentQuestion.type === "multiple") && (
                          <div className="space-y-2 pt-4">
                            {((currentQuestion.question.en as { options?: Array<{ id: string; value: string }> })?.options ||
                              (currentQuestion.question as { options?: Array<{ id: string; value?: string; en?: { value: string } }> }).options ||
                              []).map(
                              (
                                opt: { id: string; value?: string; en?: { value: string } },
                                optIdx: number
                              ) => (
                                <div
                                  key={opt.id}
                                  className="flex items-start gap-3 p-3 border rounded-lg"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <div className="flex-1">
                                    <RenderWithLatex
                                      quillString={opt.value || opt.en?.value || ""}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* Input hint for numerical */}
                        {currentQuestion.type === "integer" && (
                          <div className="pt-4">
                            <div className="p-3 border rounded-lg bg-muted/30">
                              <p className="text-sm text-muted-foreground">
                                Answer type: Numerical value
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentQuestionIndex + 1} / {allQuestions.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(allQuestions.length - 1, prev + 1)
                      )
                    }
                    disabled={currentQuestionIndex === allQuestions.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Question Palette */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {allQuestions.map((q, idx) => (
                        <button
                          type="button"
                          key={`q-${idx}`}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                            currentQuestionIndex === idx
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No questions found in this test
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="links">
          <StudentAccessLinks testId={testId} batches={test.batches || []} validTo={test.validity?.to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
