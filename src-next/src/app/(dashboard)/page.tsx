"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  Clock,
  Plus,
  Trophy,
  Target,
  TrendingDown,
  UserCheck,
  Monitor,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";

interface ITest {
  _id: string;
  name: string;
  exam?: string;
  status?: string;
  durationInMinutes?: number;
  duration?: number;
  validity?: { from: string; to: string };
  result?: {
    students?: { _id: string }[];
    highestMarks?: number;
    averageMarks?: number;
    lowestMarks?: number;
    totalAppeared?: number;
  };
}

interface IBatch {
  name: string;
  totalStudents: number;
}

interface IInstituteDetails {
  name?: string;
  members?: {
    batches?: IBatch[];
  };
}

interface RecentTestStats {
  _id: string;
  name: string;
  highestMarks: number;
  averageMarks: number;
  lowestMarks: number;
  totalAppeared: number;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant: "success" | "warning" | "error" | "primary";
}) {
  const variantStyles = {
    success: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
    error: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    primary: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  };

  const iconStyles = {
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    primary: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h4 className="text-2xl font-bold">{value}</h4>
        </div>
        <Icon className={`h-8 w-8 ${iconStyles[variant]}`} />
      </div>
    </div>
  );
}

// Test List Item Component
function TestListItem({
  index,
  test,
  onClick,
}: {
  index: number;
  test: ITest;
  onClick?: () => void;
}) {
  const durationHours = test.durationInMinutes
    ? (test.durationInMinutes / 60).toFixed(1)
    : test.duration
    ? (test.duration / 60).toFixed(1)
    : "3";

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {index}
        </span>
        <span className="font-medium">{test.name}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{durationHours} Hr</span>
        <Monitor className="h-4 w-4" />
      </div>
    </div>
  );
}

// Simple Calendar Component
function ScheduleCalendar({ tests, onTestClick }: { tests: ITest[]; onTestClick?: (test: ITest) => void }) {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf("month").day();
  const monthName = currentDate.format("MMMM YYYY");

  // Map of day -> tests available on that day
  const testsByDate = useMemo(() => {
    const dateMap = new Map<string, ITest[]>();
    tests.forEach((test) => {
      if (test.validity?.from) {
        const start = dayjs(test.validity.from);
        const end = test.validity?.to ? dayjs(test.validity.to) : start;
        let current = start;
        while (current.isBefore(end) || current.isSame(end, "day")) {
          if (current.month() === currentDate.month() && current.year() === currentDate.year()) {
            const key = current.date().toString();
            const existing = dateMap.get(key) || [];
            existing.push(test);
            dateMap.set(key, existing);
          }
          current = current.add(1, "day");
        }
      }
    });
    return dateMap;
  }, [tests, currentDate]);

  // Get tests for the selected date
  const testsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return testsByDate.get(selectedDate.date().toString()) || [];
  }, [selectedDate, testsByDate]);

  const handleDayClick = (day: number) => {
    const clickedDate = currentDate.date(day);
    const testsOnDay = testsByDate.get(day.toString()) || [];
    if (testsOnDay.length > 0) {
      setSelectedDate(clickedDate);
      setDialogOpen(true);
    }
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = dayjs().date() === day && dayjs().month() === currentDate.month() && dayjs().year() === currentDate.year();
    const testsOnDay = testsByDate.get(day.toString()) || [];
    const hasTest = testsOnDay.length > 0;

    days.push(
      <div
        key={day}
        onClick={() => handleDayClick(day)}
        className={`relative flex h-10 items-center justify-center rounded-md text-sm transition-colors ${
          isToday ? "bg-primary text-primary-foreground font-bold" : ""
        } ${hasTest && !isToday ? "bg-blue-100 dark:bg-blue-900 font-medium" : ""} ${
          hasTest ? "cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1" : ""
        }`}
      >
        {day}
        {hasTest && (
          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(currentDate.subtract(1, "month"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">{monthName}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(currentDate.add(1, "month"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-blue-100 dark:bg-blue-900" />
            <span>Scheduled Test</span>
          </div>
        </div>
      </div>

      {/* Tests Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tests on {selectedDate?.format("MMMM D, YYYY")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {testsForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No tests scheduled for this day</p>
            ) : (
              testsForSelectedDate.map((test, index) => {
                const durationHours = test.durationInMinutes
                  ? (test.durationInMinutes / 60).toFixed(1)
                  : test.duration
                  ? (test.duration / 60).toFixed(1)
                  : "3";
                return (
                  <div
                    key={test._id}
                    onClick={() => {
                      setDialogOpen(false);
                      onTestClick?.(test);
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-medium">{test.name}</span>
                        {test.validity?.from && (
                          <p className="text-xs text-muted-foreground">
                            {dayjs(test.validity.from).format("h:mm A")} - {dayjs(test.validity.to).format("h:mm A")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{durationHours} Hr</span>
                      <Monitor className="h-4 w-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper to determine test status
function getTestStatus(validity?: { from: string; to: string }) {
  if (!validity?.from || !validity?.to) return "active";
  const now = dayjs();
  const start = dayjs(validity.from);
  const end = dayjs(validity.to);
  if (now.isBefore(start)) return "upcoming";
  if (now.isAfter(end)) return "expired";
  return "ongoing";
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const isStudent = currentUser?.userType === "student";

  // State
  const [tests, setTests] = useState<ITest[]>([]);
  const [recentTests, setRecentTests] = useState<RecentTestStats[]>([]);
  const [instituteDetails, setInstituteDetails] = useState<IInstituteDetails | null>(null);
  const [selectedRecentTest, setSelectedRecentTest] = useState<string>("");
  const [loading, setLoading] = useState({
    tests: true,
    institute: true,
    recent: true,
  });

  // Fetch data
  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Fetch all tests and filter by status client-side
        const response = await api.tests.getAll();
        const data = Array.isArray(response.data) ? response.data : (response.data?.tests || response.data?.data || []);
        // Filter out draft tests - we want published tests that can be ongoing/upcoming
        const activeTests = data.filter((test: ITest) => {
          const status = test.status?.toLowerCase();
          // Exclude draft tests (not yet published)
          // Include published/scheduled/ongoing and any with validity dates
          return status !== "draft";
        });
        setTests(activeTests);
      } catch {
        setTests([]);
      } finally {
        setLoading((prev) => ({ ...prev, tests: false }));
      }
    };

    const fetchRecentTests = async () => {
      try {
        const response = await api.tests.getRecent(5);
        const data = Array.isArray(response.data) ? response.data : (response.data?.tests || response.data?.data || []);
        const testsWithStats = data.map((test: { id?: string; _id?: string; name: string; highestMarks?: number; averageMarks?: number; lowestMarks?: number; totalAppeared?: number }) => ({
          _id: test.id || test._id || "",
          name: test.name,
          highestMarks: test.highestMarks || 0,
          averageMarks: test.averageMarks || 0,
          lowestMarks: test.lowestMarks || 0,
          totalAppeared: test.totalAppeared || 0,
        }));
        setRecentTests(testsWithStats);
        if (testsWithStats.length > 0) {
          setSelectedRecentTest(testsWithStats[0]._id);
        }
      } catch {
        setRecentTests([]);
      } finally {
        setLoading((prev) => ({ ...prev, recent: false }));
      }
    };

    const fetchInstituteDetails = async () => {
      if (!currentUser?.instituteId) {
        setLoading((prev) => ({ ...prev, institute: false }));
        return;
      }
      try {
        const response = await api.institutes.getById(currentUser.instituteId);
        setInstituteDetails(response.data?.data || response.data || null);
      } catch {
        // If not found by _id, the instituteId might be the institute name (legacy data)
        try {
          const allResponse = await api.institutes.getAll();
          const institutes = Array.isArray(allResponse.data) ? allResponse.data : (allResponse.data?.data || []);
          const found = institutes.find(
            (inst: { _id: string; name: string }) =>
              inst.name === currentUser?.instituteId || inst._id === currentUser?.instituteId
          );
          setInstituteDetails(found || null);
        } catch {
          setInstituteDetails(null);
        }
      } finally {
        setLoading((prev) => ({ ...prev, institute: false }));
      }
    };

    fetchTests();
    fetchRecentTests();
    fetchInstituteDetails();
  }, [currentUser?.instituteId]);

  // Categorize tests
  const { upcomingTests, ongoingTests } = useMemo(() => {
    const upcoming: ITest[] = [];
    const ongoing: ITest[] = [];

    tests.forEach((test) => {
      const status = getTestStatus(test.validity);
      if (status === "upcoming") upcoming.push(test);
      else if (status === "ongoing") ongoing.push(test);
    });

    return { upcomingTests: upcoming, ongoingTests: ongoing };
  }, [tests]);

  // Get selected recent test stats
  const selectedTestStats = useMemo(() => {
    return recentTests.find((t) => t._id === selectedRecentTest) || recentTests[0];
  }, [recentTests, selectedRecentTest]);

  // Open test in new tab (for students)
  const handleTestClick = (testId: string) => {
    if (isStudent) {
      const token = localStorage.getItem("auth_token");
      const testPortalUrl = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "http://localhost:3001";
      window.open(`${testPortalUrl}/auth/${token}/${testId}`, "_blank");
    }
  };

  // Student Dashboard
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {currentUser?.name || "Student"}!</h1>
          <p className="text-muted-foreground">Here are your tests and progress.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tests</CardTitle>
              <CardDescription>Tests scheduled for the future</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.tests ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : upcomingTests.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No upcoming tests scheduled</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTests.slice(0, 5).map((test, i) => (
                    <TestListItem
                      key={test._id}
                      index={i + 1}
                      test={test}
                      onClick={() => handleTestClick(test._id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ongoing Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Ongoing Tests</CardTitle>
              <CardDescription>Tests you can take right now</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.tests ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : ongoingTests.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No ongoing tests available</p>
              ) : (
                <div className="space-y-2">
                  {ongoingTests.slice(0, 5).map((test, i) => (
                    <TestListItem
                      key={test._id}
                      index={i + 1}
                      test={test}
                      onClick={() => handleTestClick(test._id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Test Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Test Analysis</CardTitle>
                <CardDescription>Performance statistics from recent tests</CardDescription>
              </div>
              {recentTests.length > 0 && (
                <Select value={selectedRecentTest} onValueChange={setSelectedRecentTest}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {recentTests.map((test) => (
                      <SelectItem key={test._id} value={test._id}>
                        {test.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading.recent ? (
              <div className="grid gap-4 md:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : !selectedTestStats ? (
              <p className="py-8 text-center text-muted-foreground">No recent test data available</p>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold">{selectedTestStats.name}</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    title="Highest Marks"
                    value={selectedTestStats.highestMarks}
                    icon={Trophy}
                    variant="success"
                  />
                  <StatCard
                    title="Average Marks"
                    value={Math.round(selectedTestStats.averageMarks)}
                    icon={Target}
                    variant="warning"
                  />
                  <StatCard
                    title="Lowest Marks"
                    value={selectedTestStats.lowestMarks}
                    icon={TrendingDown}
                    variant="error"
                  />
                  <StatCard
                    title="Total Appeared"
                    value={selectedTestStats.totalAppeared}
                    icon={UserCheck}
                    variant="primary"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription>Your test schedule calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleCalendar
              tests={[...upcomingTests, ...ongoingTests]}
              onTestClick={(test) => handleTestClick(test._id)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin/Teacher Dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {currentUser?.name || "Admin"}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your platform today.</p>
        </div>
        <Link href="/tests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Test
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Test Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Test Analysis</CardTitle>
              {recentTests.length > 0 && (
                <Select value={selectedRecentTest} onValueChange={setSelectedRecentTest}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {recentTests.map((test) => (
                      <SelectItem key={test._id} value={test._id}>
                        {test.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading.recent ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : !selectedTestStats ? (
              <p className="py-8 text-center text-muted-foreground">No recent test data available</p>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold">{selectedTestStats.name}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <StatCard
                    title="Highest Marks"
                    value={selectedTestStats.highestMarks}
                    icon={Trophy}
                    variant="success"
                  />
                  <StatCard
                    title="Average Marks"
                    value={Math.round(selectedTestStats.averageMarks)}
                    icon={Target}
                    variant="warning"
                  />
                  <StatCard
                    title="Lowest Marks"
                    value={selectedTestStats.lowestMarks}
                    icon={TrendingDown}
                    variant="error"
                  />
                  <StatCard
                    title="Total Appeared"
                    value={selectedTestStats.totalAppeared}
                    icon={UserCheck}
                    variant="primary"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Ongoing Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Ongoing Tests</CardTitle>
              <CardDescription>Currently active tests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.tests ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : ongoingTests.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  Looks like you've finished all your tests!
                </p>
              ) : (
                <div className="space-y-2">
                  {ongoingTests.slice(0, 4).map((test, i) => (
                    <TestListItem
                      key={test._id}
                      index={i + 1}
                      test={test}
                      onClick={() => router.push(`/tests/${test._id}/edit`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Institute Details */}
          <Card>
            <CardHeader>
              <CardTitle>Institute Details</CardTitle>
              <CardDescription>Batch-wise student distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.institute ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : !instituteDetails?.members?.batches?.length ? (
                <p className="py-4 text-center text-muted-foreground">No batch data available</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {instituteDetails.members.batches.map((batch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">{batch.name}</span>
                      </div>
                      <Badge variant="secondary">{batch.totalStudents}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>Test schedule overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleCalendar
            tests={[...upcomingTests, ...ongoingTests]}
            onTestClick={(test) => router.push(`/tests/${test._id}/edit`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
