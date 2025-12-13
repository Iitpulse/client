"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, apiQuestions } from "@/lib/api";
import RenderWithLatex from "@/components/render-with-latex";

const typeMapping: Record<string, string> = {
  mcq: "mcq",
  numerical: "numerical",
  paragraph: "paragraph",
  matrix: "matrix",
};

const difficultyColors: Record<string, "success" | "warning" | "destructive"> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
};

interface MCQOption {
  id: string;
  value: string;
}

interface QuestionData {
  _id: string;
  type: string;
  subject: string;
  difficulty: string;
  isProofRead: boolean;
  chapters?: Array<{ name: string; topics?: string[] }>;
  correctAnswers?: string[];
  en?: {
    question: string;
    solution?: string;
    options?: MCQOption[];
  };
  hi?: {
    question: string;
    solution?: string;
    options?: MCQOption[];
  };
  correctAnswer?: { from: number; to: number };
  paragraph?: string;
  paragraphHindi?: string;
  questions?: Array<{
    _id: string;
    type: string;
    correctAnswers?: string[];
    en?: { question: string; options?: MCQOption[] };
    correctAnswer?: { from: number; to: number };
  }>;
  rows?: Array<{ left: string; leftHindi?: string; right: string[]; rightHindi?: string[] }>;
}

export default function QuestionPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const questionId = params.id as string;
  const type = searchParams.get("type") || "mcq";
  const apiType = typeMapping[type] || "mcq";

  const [question, setQuestion] = React.useState<QuestionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [langTab, setLangTab] = React.useState("en");

  React.useEffect(() => {
    const fetchQuestion = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.questions.getById(questionId, apiType);
        const data = response.data?.data || response.data;
        setQuestion(data);
      } catch (err) {
        console.error("Failed to fetch question:", err);
        setError("Failed to load question. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (questionId) {
      fetchQuestion();
    }
  }, [questionId, apiType]);

  const handleToggleProofread = async (checked: boolean) => {
    if (!question) return;
    try {
      await apiQuestions.patch(`/${apiType}/toggleproofread`, {
        id: question._id,
        isProofRead: checked,
      });
      setQuestion({ ...question, isProofRead: checked });
    } catch (err) {
      console.error("Failed to toggle proofread:", err);
    }
  };

  const handleDelete = async () => {
    if (!question) return;
    setIsDeleting(true);
    try {
      await api.questions.delete(apiType, question._id);
      router.push("/questions");
    } catch (err) {
      console.error("Failed to delete question:", err);
      setIsDeleting(false);
    }
  };

  const isOptionCorrect = (optionId: string) => {
    return question?.correctAnswers?.includes(optionId) || false;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading question...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="text-destructive">{error || "Question not found"}</div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const chapters = question.chapters || [];
  const topics = chapters.flatMap((ch) => ch.topics || []);
  const hasHindi = !!question.hi?.question;

  const renderQuestionContent = (lang: "en" | "hi") => {
    const content = question[lang];
    if (!content?.question) {
      return <div className="text-muted-foreground">No content available</div>;
    }

    return (
      <>
        {/* Question */}
        <RenderWithLatex quillString={content.question} />

        {/* MCQ Options */}
        {content.options && content.options.length > 0 && (
          <div className="mt-4 space-y-1">
            {content.options.map((option, index) => (
              <div
                key={option.id || index}
                className={`flex items-start gap-2 rounded px-2 py-1 ${
                  isOptionCorrect(option.id) ? "bg-green-50 dark:bg-green-950/20" : ""
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {String.fromCharCode(65 + index)}.
                </span>
                <div className="flex-1 text-sm">
                  <RenderWithLatex quillString={option.value} />
                </div>
                {isOptionCorrect(option.id) && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            ))}
          </div>
        )}

        {/* Numerical Answer */}
        {question.correctAnswer && (
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">Answer: </span>
            <span className="rounded bg-green-50 px-2 py-0.5 font-mono dark:bg-green-950/20">
              {question.correctAnswer.from === question.correctAnswer.to
                ? question.correctAnswer.from
                : `${question.correctAnswer.from} to ${question.correctAnswer.to}`}
            </span>
          </div>
        )}

        {/* Solution */}
        {content.solution && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Solution</h4>
              <RenderWithLatex quillString={content.solution} />
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Question Preview</h1>
            <p className="text-sm text-muted-foreground">
              {type.charAt(0).toUpperCase() + type.slice(1)} Question
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/questions/${questionId}/edit?type=${type}`}>
              <Edit className="mr-1 h-3 w-3" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Question</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this question? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-lg border bg-card p-6">
        {/* Breadcrumb Row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{question.subject}</span>
            {chapters.length > 0 && (
              <>
                <span className="text-muted-foreground">›</span>
                <span>{chapters.map((ch) => ch.name).join(", ")}</span>
              </>
            )}
            {topics.length > 0 && (
              <>
                <span className="text-muted-foreground">›</span>
                <span className="text-muted-foreground">{topics.join(", ")}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={difficultyColors[question.difficulty?.toLowerCase()] || "default"}>
              {question.difficulty}
            </Badge>
            <Badge variant={question.isProofRead ? "success" : "secondary"}>
              {question.isProofRead ? "Proofread" : "Pending"}
            </Badge>
          </div>
        </div>

        {/* Language Tabs */}
        <Tabs value={langTab} onValueChange={setLangTab}>
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="hi" disabled={!hasHindi}>
              Hindi
            </TabsTrigger>
          </TabsList>
          <TabsContent value="en" className="mt-4">
            {renderQuestionContent("en")}
          </TabsContent>
          <TabsContent value="hi" className="mt-4">
            {renderQuestionContent("hi")}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Proofread</span>
            <Switch
              checked={question.isProofRead}
              onCheckedChange={handleToggleProofread}
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Question</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this question? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
