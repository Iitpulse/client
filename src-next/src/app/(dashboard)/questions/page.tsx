"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { IQuestion, ISubject } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";

const difficultyVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
};

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<IQuestion[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [questionToDelete, setQuestionToDelete] = React.useState<IQuestion | null>(null);
  const [activeTab, setActiveTab] = React.useState("mcq");
  const [selectedSubject, setSelectedSubject] = React.useState<string>("all");

  const fetchQuestions = React.useCallback(async (type: string) => {
    setLoading(true);
    try {
      const params = selectedSubject !== "all" ? { subject: selectedSubject } : {};
      let response;

      switch (type) {
        case "mcq":
          response = await api.questions.getMCQ(params);
          break;
        case "numerical":
          response = await api.questions.getNumerical(params);
          break;
        case "paragraph":
          response = await api.questions.getParagraph(params);
          break;
        case "matrix":
          response = await api.questions.getMatrix(params);
          break;
        default:
          response = await api.questions.getMCQ(params);
      }
      // Backend returns { success, data: [...], totalDocs, currentPage, totalPages }
      setQuestions(response.data?.data || response.data?.questions || []);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject]);

  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.subjects.getAll();
        // Backend returns { success, data: [...] }
        setSubjects(response.data?.data || response.data?.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  React.useEffect(() => {
    fetchQuestions(activeTab);
  }, [activeTab, selectedSubject, fetchQuestions]);

  const handleDelete = async () => {
    if (!questionToDelete) return;
    try {
      await api.questions.delete(activeTab, questionToDelete._id);
      fetchQuestions(activeTab);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const columns: ColumnDef<IQuestion>[] = [
    {
      id: "question",
      header: "Question",
      cell: ({ row }) => {
        // Question text is at en.question, not question
        const questionText = (row.original as unknown as { en?: { question?: string } })?.en?.question || "";
        // For table display, show truncated HTML for LaTeX rendering
        const stripped = stripHtml(questionText);
        const truncatedHtml = questionText.length > 150
          ? questionText.substring(0, 150) + "..."
          : questionText;
        return (
          <div className="max-w-md font-medium" title={stripped}>
            <RenderWithLatex quillString={truncatedHtml} className="line-clamp-2" />
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => {
        const subject = row.original.subject;
        // subject can be a string (name) or an object with name property
        if (typeof subject === "string") return subject;
        if (typeof subject === "object" && subject) return (subject as { name?: string })?.name || "-";
        return "-";
      },
    },
    {
      id: "chapter",
      header: "Chapter",
      cell: ({ row }) => {
        // chapters is an array of { name, topics } objects
        const chapters = (row.original as unknown as { chapters?: Array<{ name: string }> })?.chapters;
        if (Array.isArray(chapters) && chapters.length > 0) {
          return chapters.map(ch => ch.name).join(", ");
        }
        return "-";
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as string;
        return (
          <Badge variant={difficultyVariants[difficulty] || "default"}>
            {difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isProofRead",
      header: "Status",
      cell: ({ row }) => {
        const isProofRead = row.getValue("isProofRead") as boolean;
        return (
          <Badge variant={isProofRead ? "success" : "secondary"}>
            {isProofRead ? "Proofread" : "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const question = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/questions/${question._id}/edit?type=${activeTab}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/questions/${question._id}/preview?type=${activeTab}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setQuestionToDelete(question);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
          <p className="text-muted-foreground">
            Manage your question bank
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/questions/bulk-upload">
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/questions/new?type=${activeTab}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject._id} value={subject._id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mcq">MCQ</TabsTrigger>
          <TabsTrigger value="numerical">Numerical</TabsTrigger>
          <TabsTrigger value="paragraph">Paragraph</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-muted-foreground">Loading questions...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={questions}
              searchKey="question"
              searchPlaceholder="Search questions..."
              onRowClick={(question) => router.push(`/questions/${question._id}/preview?type=${activeTab}`)}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
