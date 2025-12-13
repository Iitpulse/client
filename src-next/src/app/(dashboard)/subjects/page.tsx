"use client";

import * as React from "react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  BookOpen,
  FolderOpen,
  Tag,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
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
import { ISubject, IChapter } from "@/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState<ISubject | null>(null);
  const [selectedChapter, setSelectedChapter] = React.useState<IChapter | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [subjectDialogOpen, setSubjectDialogOpen] = React.useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = React.useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteType, setDeleteType] = React.useState<"subject" | "chapter" | "topic">("subject");

  const [newName, setNewName] = React.useState("");
  const [topicToDelete, setTopicToDelete] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchSubjects = React.useCallback(async () => {
    try {
      const response = await api.subjects.getAll();
      // Backend returns { success, data: [...] }
      setSubjects(response.data?.data || response.data?.subjects || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreateSubject = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.subjects.create({ name: newName });
      fetchSubjects();
      setSubjectDialogOpen(false);
      setNewName("");
    } catch (error) {
      console.error("Failed to create subject:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChapter = async () => {
    if (!newName.trim() || !selectedSubject) return;
    setSaving(true);
    try {
      await api.subjects.createChapter({
        subjectId: selectedSubject._id,
        name: newName,
      });
      fetchSubjects();
      setChapterDialogOpen(false);
      setNewName("");
    } catch (error) {
      console.error("Failed to create chapter:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newName.trim() || !selectedSubject || !selectedChapter) return;
    setSaving(true);
    try {
      await api.subjects.createTopic({
        subjectId: selectedSubject._id,
        chapterId: selectedChapter._id,
        topic: newName,
      });
      fetchSubjects();
      setTopicDialogOpen(false);
      setNewName("");
    } catch (error) {
      console.error("Failed to create topic:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      switch (deleteType) {
        case "subject":
          if (selectedSubject) {
            await api.subjects.deleteSubject(selectedSubject._id);
            setSelectedSubject(null);
            setSelectedChapter(null);
          }
          break;
        case "chapter":
          if (selectedSubject && selectedChapter) {
            await api.subjects.deleteChapter(
              selectedSubject._id,
              selectedChapter._id
            );
            setSelectedChapter(null);
          }
          break;
        case "topic":
          if (selectedSubject && selectedChapter && topicToDelete) {
            await api.subjects.deleteTopic(
              selectedSubject._id,
              selectedChapter._id,
              topicToDelete
            );
          }
          break;
      }
      fetchSubjects();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const openDeleteDialog = (type: "subject" | "chapter" | "topic", topic?: string) => {
    setDeleteType(type);
    if (topic) setTopicToDelete(topic);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading subjects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage subjects, chapters, and topics
          </p>
        </div>
        <Button onClick={() => setSubjectDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subjects
            </CardTitle>
            <CardDescription>Select a subject to view chapters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject._id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted ${
                  selectedSubject?._id === subject._id ? "bg-muted" : ""
                }`}
                onClick={() => {
                  setSelectedSubject(subject);
                  setSelectedChapter(null);
                }}
              >
                <span className="font-medium">{subject.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {subject.chapters?.length || 0} chapters
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-center text-muted-foreground">
                No subjects found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chapters List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Chapters
              </CardTitle>
              {selectedSubject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChapterDialogOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              )}
            </div>
            <CardDescription>
              {selectedSubject
                ? `Chapters in ${selectedSubject.name}`
                : "Select a subject first"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedSubject?.chapters?.map((chapter) => (
              <div
                key={chapter._id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted ${
                  selectedChapter?._id === chapter._id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedChapter(chapter)}
              >
                <span className="font-medium">{chapter.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {chapter.topics?.length || 0} topics
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            {selectedSubject && !selectedSubject.chapters?.length && (
              <p className="text-center text-muted-foreground">
                No chapters found
              </p>
            )}
            {!selectedSubject && (
              <p className="text-center text-muted-foreground">
                Select a subject to view chapters
              </p>
            )}
          </CardContent>
        </Card>

        {/* Topics List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Topics
              </CardTitle>
              {selectedChapter && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTopicDialogOpen(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              )}
            </div>
            <CardDescription>
              {selectedChapter
                ? `Topics in ${selectedChapter.name}`
                : "Select a chapter first"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedChapter?.topics?.map((topic, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span>{topic}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => openDeleteDialog("topic", topic)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {selectedChapter && !selectedChapter.topics?.length && (
              <p className="text-center text-muted-foreground">
                No topics found
              </p>
            )}
            {!selectedChapter && (
              <p className="text-center text-muted-foreground">
                Select a chapter to view topics
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Enter the name for the new subject
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="subjectName">Subject Name</Label>
            <Input
              id="subjectName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Physics, Chemistry, Mathematics"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubject}
              disabled={saving || !newName.trim()}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Chapter</DialogTitle>
            <DialogDescription>
              Add a new chapter to {selectedSubject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapterName">Chapter Name</Label>
            <Input
              id="chapterName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Mechanics, Thermodynamics"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChapterDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChapter}
              disabled={saving || !newName.trim()}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topic Dialog */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Topic</DialogTitle>
            <DialogDescription>
              Add a new topic to {selectedChapter?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="topicName">Topic Name</Label>
            <Input
              id="topicName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Newton's Laws, Heat Transfer"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopicDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              disabled={saving || !newName.trim()}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteType.charAt(0).toUpperCase() + deleteType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType}? This action
              cannot be undone.
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
