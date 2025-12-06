"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Check, X, AlertCircle } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { ISubject, IChapter } from "@/types";

interface ParsedQuestion {
  id: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  solution?: string;
  isValid: boolean;
  error?: string;
}

export default function BulkUploadPage() {
  const router = useRouter();

  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedChapter, setSelectedChapter] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");

  const [file, setFile] = React.useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([]);
  const [parsing, setParsing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [step, setStep] = React.useState<"upload" | "preview" | "complete">("upload");

  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.subjects.getAll();
        setSubjects(response.data?.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  React.useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedSubject) {
        setChapters([]);
        return;
      }
      try {
        const response = await api.subjects.getChapters(selectedSubject);
        setChapters(response.data?.chapters || []);
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      }
    };
    fetchChapters();
  }, [selectedSubject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseFile = async () => {
    if (!file) return;

    setParsing(true);
    try {
      // For now, simulate parsing - in production this would call an API
      // that parses DOCX files
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated parsed questions
      const mockQuestions: ParsedQuestion[] = [
        {
          id: "1",
          question: "Sample question 1 from document?",
          options: [
            { text: "Option A", isCorrect: true },
            { text: "Option B", isCorrect: false },
            { text: "Option C", isCorrect: false },
            { text: "Option D", isCorrect: false },
          ],
          solution: "This is the solution for question 1",
          isValid: true,
        },
        {
          id: "2",
          question: "Sample question 2 from document?",
          options: [
            { text: "Option A", isCorrect: false },
            { text: "Option B", isCorrect: true },
            { text: "Option C", isCorrect: false },
            { text: "Option D", isCorrect: false },
          ],
          isValid: true,
        },
        {
          id: "3",
          question: "Invalid question without correct answer?",
          options: [
            { text: "Option A", isCorrect: false },
            { text: "Option B", isCorrect: false },
          ],
          isValid: false,
          error: "No correct answer marked",
        },
      ];

      setParsedQuestions(mockQuestions);
      setStep("preview");
    } catch (error) {
      console.error("Failed to parse file:", error);
    } finally {
      setParsing(false);
    }
  };

  const uploadQuestions = async () => {
    if (!selectedSubject || !selectedChapter) {
      alert("Please select subject and chapter");
      return;
    }

    const validQuestions = parsedQuestions.filter((q) => q.isValid);
    if (validQuestions.length === 0) {
      alert("No valid questions to upload");
      return;
    }

    setUploading(true);
    try {
      const questionsToUpload = validQuestions.map((q) => ({
        question: q.question,
        options: q.options.map((opt) => ({
          option: opt.text,
          isCorrect: opt.isCorrect,
        })),
        solution: q.solution,
        subject: selectedSubject,
        chapter: selectedChapter,
        difficulty,
        type: q.options.filter((o) => o.isCorrect).length > 1 ? "multiple" : "single",
      }));

      // Upload each question
      for (const question of questionsToUpload) {
        await api.questions.create("mcq", question);
      }

      setStep("complete");
    } catch (error) {
      console.error("Failed to upload questions:", error);
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const invalidCount = parsedQuestions.filter((q) => !q.isValid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/questions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload</h1>
          <p className="text-muted-foreground">
            Upload multiple questions from a Word document
          </p>
        </div>
      </div>

      {step === "upload" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload a Word document (.docx) containing questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileChange}
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={parseFile}
                disabled={!file || parsing}
                className="w-full"
              >
                {parsing ? (
                  "Parsing..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Parse Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Question Settings</CardTitle>
              <CardDescription>
                Set the subject and chapter for all questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
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
              </div>

              <div className="space-y-2">
                <Label>Chapter</Label>
                <Select
                  value={selectedChapter}
                  onValueChange={setSelectedChapter}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter._id} value={chapter._id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value) =>
                    setDifficulty(value as "easy" | "medium" | "hard")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Questions</CardTitle>
                <CardDescription>
                  Review parsed questions before uploading
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{validCount} Valid</Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">{invalidCount} Invalid</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Options</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedQuestions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {q.question}
                    </TableCell>
                    <TableCell>{q.options.length}</TableCell>
                    <TableCell>
                      {q.isValid ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" />
                          Valid
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive">
                          <X className="h-4 w-4" />
                          {q.error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={uploadQuestions} disabled={uploading || validCount === 0}>
                {uploading ? "Uploading..." : `Upload ${validCount} Questions`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Upload Complete</h2>
            <p className="mt-2 text-muted-foreground">
              Successfully uploaded {validCount} questions
            </p>
            <div className="mt-6 flex gap-4">
              <Button variant="outline" onClick={() => router.push("/questions")}>
                View Questions
              </Button>
              <Button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setParsedQuestions([]);
                }}
              >
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Document Format
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-2">Your Word document should follow this format:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Each question starts with "Q." or a number followed by a period</li>
            <li>Options should be labeled as (a), (b), (c), (d) or A., B., C., D.</li>
            <li>Correct answers should be marked with an asterisk (*) or bold</li>
            <li>Solutions can be added after "Solution:" or "Explanation:"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
