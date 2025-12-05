"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { ISubject, IChapter } from "@/types";

const questionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  solution: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  chapter: z.string().min(1, "Chapter is required"),
  topics: z.array(z.string()).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  options: z.array(z.object({
    text: z.string().min(1, "Option text is required"),
    isCorrect: z.boolean(),
  })).min(2, "At least 2 options are required"),
});

type QuestionFormData = z.infer<typeof questionSchema>;

export default function CreateQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "mcq";

  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [options, setOptions] = React.useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      difficulty: "medium",
      options: options,
      topics: [],
    },
  });

  const selectedSubject = watch("subject");

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

  const addOption = () => {
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    setValue("options", newOptions);
  };

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const newOptions = options.map((opt, i) => {
      if (i === index) {
        return { ...opt, [field]: value };
      }
      return opt;
    });
    setOptions(newOptions);
    setValue("options", newOptions);
  };

  const onSubmit = async (data: QuestionFormData) => {
    setLoading(true);
    try {
      const questionData = {
        question: data.question,
        solution: data.solution,
        subject: data.subject,
        chapter: data.chapter,
        topics: data.topics,
        difficulty: data.difficulty,
        options: options.map((opt) => ({
          option: opt.text,
          isCorrect: opt.isCorrect,
        })),
        type: type === "mcq" ? (options.filter(o => o.isCorrect).length > 1 ? "multiple" : "single") : type,
      };

      await api.questions.create(type, questionData);
      router.push("/questions");
    } catch (error) {
      console.error("Failed to create question:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/questions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create {type.toUpperCase()} Question
          </h1>
          <p className="text-muted-foreground">
            Add a new question to your bank
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
            <CardDescription>
              Enter the question and its metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                placeholder="Enter your question here..."
                rows={4}
                {...register("question")}
              />
              {errors.question && (
                <p className="text-sm text-destructive">
                  {errors.question.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select onValueChange={(value) => setValue("subject", value)}>
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
                {errors.subject && (
                  <p className="text-sm text-destructive">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Select
                  onValueChange={(value) => setValue("chapter", value)}
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
                {errors.chapter && (
                  <p className="text-sm text-destructive">
                    {errors.chapter.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  defaultValue="medium"
                  onValueChange={(value) =>
                    setValue("difficulty", value as "easy" | "medium" | "hard")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {type === "mcq" && (
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                Add options and mark the correct one(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={(checked) =>
                      updateOption(index, "isCorrect", checked as boolean)
                    }
                  />
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) =>
                      updateOption(index, "text", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.options && (
                <p className="text-sm text-destructive">
                  {errors.options.message}
                </p>
              )}
              <Button type="button" variant="outline" onClick={addOption}>
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </CardContent>
          </Card>
        )}

        {type === "numerical" && (
          <Card>
            <CardHeader>
              <CardTitle>Answer</CardTitle>
              <CardDescription>
                Enter the correct numerical answer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="answerFrom">Answer (From)</Label>
                  <Input
                    id="answerFrom"
                    type="number"
                    step="any"
                    placeholder="Minimum value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answerTo">Answer (To)</Label>
                  <Input
                    id="answerTo"
                    type="number"
                    step="any"
                    placeholder="Maximum value"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Solution</CardTitle>
            <CardDescription>
              Provide a detailed solution (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter the solution explanation..."
              rows={6}
              {...register("solution")}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/questions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Question"}
          </Button>
        </div>
      </form>
    </div>
  );
}
