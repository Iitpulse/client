"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface SubjectCardProps {
  name: string;
  marks: number;
  totalMarksPerSection: number;
  attempted: number;
  correct: number;
  incorrect: number;
  timeTakenInSeconds: number;
  totalQuestions: number;
  positiveScore: number;
  variant?: "primary" | "success" | "warning" | "error";
}

const variantColors = {
  primary: "border-l-blue-500",
  success: "border-l-green-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
};

export function SubjectCard({
  name,
  marks,
  totalMarksPerSection,
  attempted,
  correct,
  incorrect,
  timeTakenInSeconds,
  totalQuestions,
  positiveScore,
  variant = "primary",
}: SubjectCardProps) {
  const unattempted = totalQuestions - (correct + incorrect);
  const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : "0";

  const chartData = {
    labels: ["Correct", "Incorrect", "Unattempted"],
    datasets: [
      {
        data: [correct, incorrect, unattempted],
        backgroundColor: ["#22c55e", "#ef4444", "#eab308"],
        borderColor: ["#22c55e", "#ef4444", "#eab308"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: false,
      },
    },
    cutout: "60%",
    maintainAspectRatio: true,
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className={`border-l-4 ${variantColors[variant]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg uppercase">{name}</CardTitle>
          <div className="text-2xl font-bold">
            {marks}/{totalMarksPerSection}
          </div>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <div>
            Accuracy: <span className="font-medium text-foreground">{accuracy}%</span>
          </div>
          <div>
            Time: <span className="font-medium text-foreground">{formatTime(timeTakenInSeconds)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visited</span>
              <span className="font-medium">{attempted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attempted</span>
              <span className="font-medium">{correct + incorrect}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correct</span>
              <span className="font-medium text-green-600">{correct}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incorrect</span>
              <span className="font-medium text-red-600">{incorrect}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Positive Marks</span>
              <span className="font-medium text-green-600">+{positiveScore}</span>
            </div>
          </div>
          <div className="h-24 w-24">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>Incorrect</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>Unattempted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
