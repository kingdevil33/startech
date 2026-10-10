import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Star,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  BookOpen,
  Video,
  ArrowRight,
  Award,
  Bot,
  MessageSquare,
  ClipboardCheck,
  ChevronDown,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, description, meta_title, meta_description")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!course) return { title: "Course Not Found" };

  return {
    title: course.meta_title || course.title,
    description: course.meta_description || course.description || undefined,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!courses_instructor_id_fkey (
        id, full_name, avatar_url, bio
      ),
      weeks (
        id, title, description, week_number, is_published,
        lessons (
          id, title, lesson_type, sort_order, duration_minutes, is_published, is_free_preview
        ),
        assignments (
          id, title, is_published
        )
      ),
      cohorts (
        id, name, slug, description, price, currency, capacity, seats_filled,
        enrollment_opens_at, enrollment_closes_at, starts_at, ends_at,
        timezone, status, coupon_codes
      )
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  // Sort weeks by week_number
  const weeks = (course.weeks || []).sort(
    (a: { week_number: number }, b: { week_number: number }) =>
      a.week_number - b.week_number
  );

  // Sort lessons within weeks
  weeks.forEach((week: { lessons: { sort_order: number }[] }) => {
    week.lessons?.sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    );
  });

  // Get the open or next cohort
  const openCohorts = (course.cohorts || []).filter(
    (c: { status: string }) => c.status === "enrollment_open"
  );
  const featuredCohort = openCohorts[0] || course.cohorts?.[0];

  // Calculate stats
  const totalLessons = weeks.reduce(
    (sum: number, w: { lessons: unknown[] }) => sum + (w.lessons?.length || 0),
    0
  );
  const totalMinutes = weeks.reduce(
    (sum: number, w: { lessons: { duration_minutes: number | null }[] }) =>
      sum +
      (w.lessons?.reduce(
        (ls: number, l: { duration_minutes: number | null }) =>
          ls + (l.duration_minutes || 0),
        0
      ) || 0),
    0
  );
  const totalAssignments = weeks.reduce(
    (sum: number, w: { assignments: unknown[] }) =>
      sum + (w.assignments?.length || 0),
    0
  );

  const instructor = course.instructor;
  const instructorInitials = instructor?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-primary-900/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-white">
              Star<span className="text-accent-400">Tech</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" className="text-gray-300 hover:text-white" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button variant="accent" size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-hero-gradient pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-10 right-20 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Link href="/courses" className="hover:text-white transition-colors">
                Courses
              </Link>
              <span>/</span>
              <span className="text-gray-300">{course.title}</span>
            </div>

            {/* Category & Level */}
            <div className="flex items-center gap-2 mb-4">
              {course.category && (
                <Badge variant="secondary" className="bg-white/10 text-gray-200 border-0">
                  {course.category}
                </Badge>
              )}
              {course.level && (
                <Badge variant="accent" className="capitalize">
                  {course.level}
                </Badge>
              )}
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              {course.title}
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-2xl leading-relaxed">
              {course.description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-accent-400" />
                {totalLessons} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-accent-400" />
                {Math.round(totalMinutes / 60)}+ hours of content
              </span>
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-accent-400" />
                {totalAssignments} assignments
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-accent-400" />
                {course.estimated_duration_weeks} weeks
              </span>
            </div>

            {/* Instructor */}
            {instructor && (
              <div className="flex items-center gap-3 mt-8">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={instructor.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary-600 text-white text-sm">
                    {instructorInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-gray-400">Instructor</p>
                  <p className="text-white font-medium">
                    {instructor.full_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Course content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Long description */}
              {course.long_description && (
                <div>
                  <h2 className="font-heading text-2xl font-bold mb-4">
                    About This Course
                  </h2>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {course.long_description}
                  </div>
                </div>
              )}

              {/* What you'll get */}
              <div>
                <h2 className="font-heading text-2xl font-bold mb-6">
                  What&apos;s Included
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Video, label: `${totalLessons} video lessons with HD streaming` },
                    { icon: Calendar, label: "Weekly live Q&A sessions" },
                    { icon: ClipboardCheck, label: `${totalAssignments} hands-on assignments` },
                    { icon: MessageSquare, label: "Private cohort discussion forum" },
                    { icon: Bot, label: "AI study buddy — 24/7 support" },
                    { icon: Award, label: "Verified certificate on completion" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="rounded-lg bg-accent-500/10 p-2 shrink-0">
                        <item.icon className="h-4 w-4 text-accent-500" />
                      </div>
                      <p className="text-sm leading-relaxed">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curriculum */}
              <div>
                <h2 className="font-heading text-2xl font-bold mb-6">
                  Curriculum
                </h2>
                <div className="space-y-3">
                  {weeks.map(
                    (week: {
                      id: string;
                      title: string;
                      description: string | null;
                      week_number: number;
                      lessons: {
                        id: string;
                        title: string;
                        lesson_type: string;
                        duration_minutes: number | null;
                        is_free_preview: boolean;
                      }[];
                      assignments: { id: string; title: string }[];
                    }) => (
                      <details
                        key={week.id}
                        className="group rounded-xl border border-border bg-card overflow-hidden"
                      >
                        <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-5 hover:bg-muted/50 transition-colors select-none">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600/20 text-primary-600 dark:text-primary-300 text-sm font-bold shrink-0">
                              {week.week_number}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">
                                {week.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {week.lessons?.length || 0} lessons
                                {week.assignments?.length
                                  ? ` · ${week.assignments.length} assignment`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>

                        <div className="px-4 sm:px-5 pb-4 border-t border-border">
                          <ul className="divide-y divide-border">
                            {week.lessons?.map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-center justify-between py-3"
                              >
                                <div className="flex items-center gap-3">
                                  {lesson.lesson_type === "video" ? (
                                    <Video className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-sm">
                                    {lesson.title}
                                  </span>
                                  {lesson.is_free_preview && (
                                    <Badge
                                      variant="accent"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      Free
                                    </Badge>
                                  )}
                                </div>
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">
                                    {lesson.duration_minutes} min
                                  </span>
                                )}
                              </li>
                            ))}
                            {week.assignments?.map((assignment) => (
                              <li
                                key={assignment.id}
                                className="flex items-center gap-3 py-3"
                              >
                                <ClipboardCheck className="h-4 w-4 text-electric-500" />
                                <span className="text-sm font-medium">
                                  📋 {assignment.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Right: Enrollment sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                {featuredCohort ? (
                  <Card className="overflow-hidden">
                    {/* Gradient header */}
                    <div className="bg-hero-gradient p-6 text-center">
                      <p className="text-3xl font-heading font-bold text-white">
                        {formatCurrency(
                          featuredCohort.price,
                          featuredCohort.currency
                        )}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        per student
                      </p>
                    </div>

                    <div className="p-6 space-y-5">
                      <h3 className="font-heading font-semibold text-lg">
                        {featuredCohort.name}
                      </h3>

                      {featuredCohort.description && (
                        <p className="text-sm text-muted-foreground">
                          {featuredCohort.description}
                        </p>
                      )}

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Starts</span>
                          <span className="font-medium">
                            {formatDate(featuredCohort.starts_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">
                            {course.estimated_duration_weeks} weeks
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Seats</span>
                          <span className="font-medium">
                            {featuredCohort.seats_filled}/
                            {featuredCohort.capacity} filled
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Enrollment closes
                          </span>
                          <span className="font-medium">
                            {formatDate(featuredCohort.enrollment_closes_at)}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      {/* Seat availability bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">
                            Availability
                          </span>
                          <span className="font-medium text-accent-500">
                            {featuredCohort.capacity -
                              featuredCohort.seats_filled}{" "}
                            seats left
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-gradient transition-all"
                            style={{
                              width: `${
                                (featuredCohort.seats_filled /
                                  featuredCohort.capacity) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {featuredCohort.status === "enrollment_open" ? (
                        <Button
                          variant="gradient"
                          size="lg"
                          className="w-full"
                          asChild
                        >
                          <Link
                            href={`/enroll/${course.slug}/${featuredCohort.slug}`}
                          >
                            Enroll Now
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full"
                          disabled
                        >
                          Enrollment Not Open
                        </Button>
                      )}

                      {/* Coupon hint */}
                      {featuredCohort.coupon_codes?.length > 0 && (
                        <p className="text-xs text-center text-muted-foreground">
                          🎟️ Coupon codes available at checkout
                        </p>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 text-center">
                    <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-medium mb-1">Coming Soon</p>
                    <p className="text-sm text-muted-foreground">
                      This course doesn&apos;t have any cohorts yet. Check back
                      later!
                    </p>
                  </Card>
                )}

                {/* Guarantee card */}
                <Card className="p-5 mt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {course.estimated_duration_weeks * 7 + 90} days of access
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Keep access for 90 days after your cohort ends.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} StarTech. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
