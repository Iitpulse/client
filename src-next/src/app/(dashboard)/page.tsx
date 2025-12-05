"use client";

import { useEffect } from "react";
import { useTestsStore, useUsersStore, useAuthStore } from "@/stores";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Users, BookOpen, Clock, Plus } from "lucide-react";

export default function DashboardPage() {
  const { currentUser } = useAuthStore();
  const { tests, fetchTests, isLoading: testsLoading } = useTestsStore();
  const { students, teachers, fetchStudents, fetchTeachers } = useUsersStore();

  useEffect(() => {
    fetchTests();
    fetchStudents();
    fetchTeachers();
  }, [fetchTests, fetchStudents, fetchTeachers]);

  const stats = [
    {
      title: "Total Tests",
      value: tests.all.length,
      icon: FileText,
      href: "/tests",
      color: "text-blue-600",
    },
    {
      title: "Ongoing Tests",
      value: tests.ongoing.length,
      icon: Clock,
      href: "/tests?status=ongoing",
      color: "text-green-600",
    },
    {
      title: "Students",
      value: students.length,
      icon: Users,
      href: "/users?tab=students",
      color: "text-purple-600",
    },
    {
      title: "Teachers",
      value: teachers.length,
      icon: BookOpen,
      href: "/users?tab=teachers",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {currentUser?.name || "Admin"}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your platform today.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/tests/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {testsLoading ? "..." : stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Tests */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tests</CardTitle>
            <CardDescription>Tests scheduled for the future</CardDescription>
          </CardHeader>
          <CardContent>
            {tests.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming tests scheduled
              </p>
            ) : (
              <div className="space-y-4">
                {tests.upcoming.slice(0, 5).map((test) => (
                  <div
                    key={test._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(test.validity.from).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/tests/${test._id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ongoing Tests</CardTitle>
            <CardDescription>Currently active tests</CardDescription>
          </CardHeader>
          <CardContent>
            {tests.ongoing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tests currently running
              </p>
            ) : (
              <div className="space-y-4">
                {tests.ongoing.slice(0, 5).map((test) => (
                  <div
                    key={test._id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {test.durationInMinutes} mins
                      </p>
                    </div>
                    <Link href={`/tests/${test._id}/results`}>
                      <Button variant="ghost" size="sm">
                        Results
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
