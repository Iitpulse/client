"use client";

import * as React from "react";
import { CheckCircle2, XCircle, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import RenderWithLatex from "@/components/render-with-latex";
import { IQuestion } from "@/types";

interface QuestionPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  question: IQuestion | null;
}

export function QuestionPreviewDialog({
  open,
  onClose,
  question,
}: QuestionPreviewDialogProps) {
  if (!question) return null;

  const questionText = question.en?.question || question.question || "";
  const solutionText = question.en?.solution || question.solution || "";
  const difficulty = question.difficulty;
  const difficultyLower = difficulty?.toLowerCase();
  const difficultyColorClass =
    difficultyLower === "easy"
      ? "!bg-green-100 !text-green-800 border-green-200"
      : difficultyLower === "medium"
      ? "!bg-yellow-100 !text-yellow-800 border-yellow-200"
      : "!bg-red-100 !text-red-800 border-red-200";

  // Get options for MCQ questions
  const options = (question as { options?: Array<{ id: string; en?: { value: string }; hi?: { value: string } }> }).options;
  const correctAnswers = (question as { correctAnswers?: string[] }).correctAnswers || [];

  // Get correct answer for integer questions
  const correctAnswer = (question as { correctAnswer?: { from: number; to: number } }).correctAnswer;

  // Get paragraph for paragraph questions
  const paragraph = (question as { paragraph?: { en?: { value: string }; hi?: { value: string } } }).paragraph;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Question Preview</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{question.type}</Badge>
              <Badge variant="outline" className={difficultyColorClass}>
                {difficulty}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6">
            {/* Paragraph (for paragraph type questions) */}
            {paragraph && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Paragraph</h4>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <RenderWithLatex quillString={paragraph.en?.value || ""} />
                </div>
              </div>
            )}

            {/* Question */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Question</h4>
              <div className="p-4 bg-background rounded-lg border">
                <RenderWithLatex quillString={questionText} />
              </div>
            </div>

            {/* Options (for MCQ questions) */}
            {options && options.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Options</h4>
                <div className="space-y-2">
                  {options.map((option, index) => {
                    const isCorrect = correctAnswers.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border flex items-start gap-3 ${
                          isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-background"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="flex-1">
                          <RenderWithLatex quillString={option.en?.value || ""} />
                        </div>
                        {isCorrect && (
                          <Badge variant="outline" className="!bg-green-100 !text-green-800 border-green-200">
                            Correct
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Correct Answer (for integer questions) */}
            {correctAnswer && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Correct Answer</h4>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  {correctAnswer.from === correctAnswer.to ? (
                    <span className="font-medium text-green-800">{correctAnswer.from}</span>
                  ) : (
                    <span className="font-medium text-green-800">
                      Range: {correctAnswer.from} to {correctAnswer.to}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Solution */}
            {solutionText && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Solution</h4>
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                    <RenderWithLatex quillString={solutionText} />
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Details</h4>

              {/* Proofread Status & Uploader */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  {question.isProofRead ? (
                    <Badge variant="outline" className="!bg-green-100 !text-green-800 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Proofread
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="!bg-orange-100 !text-orange-800 border-orange-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Proofread
                    </Badge>
                  )}
                </div>
                {question.uploadedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Uploaded by:</span>
                    <span className="font-medium">
                      {question.uploadedBy.userType}
                      {question.uploadedBy.id && (
                        <span className="text-muted-foreground ml-1">
                          ({question.uploadedBy.id.slice(-8)})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {question.chapters && question.chapters.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Chapter:</span>{" "}
                    <span className="font-medium">{question.chapters[0]?.name || "-"}</span>
                  </div>
                )}
                {question.topics && question.topics.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Topics:</span>{" "}
                    <span className="font-medium">{question.topics.join(", ")}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <span className="font-mono text-xs">{question._id}</span>
                </div>
                {question.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    <span className="font-medium">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
