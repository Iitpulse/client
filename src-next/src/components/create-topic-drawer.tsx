"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ChapterOption {
  _id?: string;
  id?: string;
  name: string;
  topics?: string[];
}

interface CreateTopicDialogProps {
  open: boolean;
  onClose: () => void;
  chapterOptions: ChapterOption[];
  onAddTopic: (data: { chapter: string; topic: string }) => Promise<void>;
}

// Keep the old name as an alias for backward compatibility
export function CreateTopicDrawer(props: CreateTopicDialogProps) {
  return <CreateTopicDialog {...props} />;
}

export function CreateTopicDialog({
  open,
  onClose,
  chapterOptions,
  onAddTopic,
}: CreateTopicDialogProps) {
  const [chapter, setChapter] = React.useState<string>("");
  const [topic, setTopic] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const handleSubmit = async () => {
    setError("");

    if (!topic.trim()) {
      setError("Please enter a topic name");
      return;
    }

    if (!chapter) {
      setError("Please select a chapter");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTopic({ chapter, topic: topic.trim() });
      // Reset form on success
      setChapter("");
      setTopic("");
    } catch (err) {
      setError("Failed to add topic. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setChapter("");
    setTopic("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Topic</DialogTitle>
          <DialogDescription>
            Create a new topic under an existing chapter.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter</Label>
            <Select value={chapter} onValueChange={setChapter}>
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map((ch) => (
                  <SelectItem key={ch._id || ch.id || ch.name} value={ch.name}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic Name</Label>
            <Input
              id="topic"
              placeholder="Enter topic name"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
