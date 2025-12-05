"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

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
import { IPattern, IBatch, ITest } from "@/types";
import Link from "next/link";

const testSchema = z.object({
  name: z.string().min(1, "Test name is required"),
  description: z.string().optional(),
  pattern: z.string().min(1, "Pattern is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  validityFrom: z.string().min(1, "Start date is required"),
  validityTo: z.string().min(1, "End date is required"),
  batches: z.array(z.string()).min(1, "At least one batch must be selected"),
  hideResult: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
});

type TestFormData = z.infer<typeof testSchema>;

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = React.useState<ITest | null>(null);
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [selectedBatches, setSelectedBatches] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, patternsRes, batchesRes] = await Promise.all([
          api.tests.getById(testId),
          api.patterns.getAllNoPagination(),
          api.batches.getAll(),
        ]);

        const testData = testRes.data?.test;
        setTest(testData);
        setPatterns(patternsRes.data?.patterns || []);
        setBatches(batchesRes.data?.batches || []);

        if (testData) {
          const patternId = typeof testData.pattern === "object"
            ? testData.pattern._id
            : testData.pattern;

          const batchIds = testData.batches?.map((b: IBatch | string) =>
            typeof b === "object" ? b._id : b
          ) || [];

          reset({
            name: testData.name,
            description: testData.description || "",
            pattern: patternId,
            duration: testData.duration,
            validityFrom: testData.validity?.from
              ? new Date(testData.validity.from).toISOString().slice(0, 16)
              : "",
            validityTo: testData.validity?.to
              ? new Date(testData.validity.to).toISOString().slice(0, 16)
              : "",
            batches: batchIds,
            hideResult: testData.hideResult || false,
            shuffleQuestions: testData.shuffleQuestions || false,
            shuffleOptions: testData.shuffleOptions || false,
          });
          setSelectedBatches(batchIds);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [testId, reset]);

  const onSubmit = async (data: TestFormData) => {
    setLoading(true);
    try {
      const testData = {
        id: testId,
        name: data.name,
        description: data.description,
        pattern: data.pattern,
        duration: data.duration,
        validity: {
          from: new Date(data.validityFrom).toISOString(),
          to: new Date(data.validityTo).toISOString(),
        },
        batches: data.batches,
        hideResult: data.hideResult,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
      };
      await api.tests.update(testData);
      router.push("/tests");
    } catch (error) {
      console.error("Failed to update test:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchToggle = (batchId: string) => {
    const updated = selectedBatches.includes(batchId)
      ? selectedBatches.filter((id) => id !== batchId)
      : [...selectedBatches, batchId];
    setSelectedBatches(updated);
    setValue("batches", updated);
  };

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading test...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Test</h1>
          <p className="text-muted-foreground">
            Update the test configuration
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the basic details for the test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Test Name</Label>
                <Input
                  id="name"
                  placeholder="Enter test name"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pattern">Pattern</Label>
                <Select
                  defaultValue={typeof test?.pattern === "object" ? test.pattern._id : (test?.pattern || "")}
                  onValueChange={(value) => setValue("pattern", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {patterns.map((pattern) => (
                      <SelectItem key={pattern._id} value={pattern._id}>
                        {pattern.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.pattern && (
                  <p className="text-sm text-destructive">
                    {errors.pattern.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter test description (optional)"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule & Duration</CardTitle>
            <CardDescription>
              Update when the test will be available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="validityFrom">Start Date & Time</Label>
                <Input
                  id="validityFrom"
                  type="datetime-local"
                  {...register("validityFrom")}
                />
                {errors.validityFrom && (
                  <p className="text-sm text-destructive">
                    {errors.validityFrom.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityTo">End Date & Time</Label>
                <Input
                  id="validityTo"
                  type="datetime-local"
                  {...register("validityTo")}
                />
                {errors.validityTo && (
                  <p className="text-sm text-destructive">
                    {errors.validityTo.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 180"
                  {...register("duration")}
                />
                {errors.duration && (
                  <p className="text-sm text-destructive">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Batches</CardTitle>
            <CardDescription>
              Select which batches can take this test
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.batches && (
              <p className="mb-4 text-sm text-destructive">
                {errors.batches.message}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              {batches.map((batch) => (
                <div
                  key={batch._id}
                  className="flex items-center space-x-2 rounded-lg border p-4"
                >
                  <Checkbox
                    id={batch._id}
                    checked={selectedBatches.includes(batch._id)}
                    onCheckedChange={() => handleBatchToggle(batch._id)}
                  />
                  <Label htmlFor={batch._id} className="cursor-pointer">
                    {batch.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Settings</CardTitle>
            <CardDescription>
              Configure additional test options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2 rounded-lg border p-4">
                <Checkbox
                  id="hideResult"
                  {...register("hideResult")}
                  onCheckedChange={(checked) =>
                    setValue("hideResult", checked as boolean)
                  }
                />
                <Label htmlFor="hideResult" className="cursor-pointer">
                  Hide Results
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-4">
                <Checkbox
                  id="shuffleQuestions"
                  {...register("shuffleQuestions")}
                  onCheckedChange={(checked) =>
                    setValue("shuffleQuestions", checked as boolean)
                  }
                />
                <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                  Shuffle Questions
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-4">
                <Checkbox
                  id="shuffleOptions"
                  {...register("shuffleOptions")}
                  onCheckedChange={(checked) =>
                    setValue("shuffleOptions", checked as boolean)
                  }
                />
                <Label htmlFor="shuffleOptions" className="cursor-pointer">
                  Shuffle Options
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/tests">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
