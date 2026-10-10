import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Star,
  Clock,
  Users,
  BarChart3,
  ArrowRight,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse our catalog of cohort-based courses. Learn web development with live sessions, peer reviews, and an AI study buddy.",
};

export default async function CoursesPage() {
  const supabase = await createClient();

  // Fetch published courses with instructor and cohort data
  const { data: courses } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!courses_instructor_id_fkey (
        id, full_name, avatar_url
      ),
      cohorts (
        id, name, slug, price, currency, capacity, seats_filled,
        enrollment_opens_at, enrollment_closes_at, starts_at, ends_at,
        status
      )
    `
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

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
          <div className="hidden md:flex items-center gap-8">
            <Link href="/courses" className="text-sm text-white font-medium">
              Courses
            </Link>
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
              About
            </Link>
          </div>
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

      {/* ── Hero Header ── */}
      <section className="bg-hero-gradient pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-10 right-20 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-4">
              <Zap className="h-3.5 w-3.5 mr-1" />
              {courses?.length || 0} Course{(courses?.length || 0) !== 1 ? "s" : ""} Available
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Explore Our{" "}
              <span className="text-gradient">Courses</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">
              Cohort-based programs with live sessions, peer reviews, and an AI study buddy to accelerate your learning.
            </p>
          </div>
        </div>
      </section>

      {/* ── Course Grid ── */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {courses && courses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                // Find the best cohort (enrollment_open first, then upcoming)
                const openCohort = course.cohorts?.find(
                  (c: { status: string }) => c.status === "enrollment_open"
                );
                const bestCohort = openCohort || course.cohorts?.[0];

                const levelColors: Record<string, string> = {
                  beginner: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
                  intermediate: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  advanced: "bg-electric-500/10 text-electric-600 dark:text-electric-400",
                };

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="group"
                  >
                    <Card className="overflow-hidden card-hover h-full flex flex-col">
                      {/* Thumbnail */}
                      <div className="relative h-48 bg-primary-600/20 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-700/40 to-primary-900/60" />
                        <Star className="h-12 w-12 text-primary-300/50 group-hover:scale-110 transition-transform duration-300" />

                        {/* Level badge */}
                        {course.level && (
                          <div className="absolute top-3 left-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                levelColors[course.level] || ""
                              }`}
                            >
                              {course.level}
                            </span>
                          </div>
                        )}

                        {/* Enrollment status */}
                        {openCohort && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="accent" className="text-xs">
                              Enrolling Now
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex-1">
                          {course.category && (
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                              {course.category}
                            </p>
                          )}
                          <h3 className="font-heading text-lg font-semibold mb-2 group-hover:text-accent-500 transition-colors line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {course.description}
                          </p>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {course.estimated_duration_weeks} weeks
                          </span>
                          {bestCohort && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {bestCohort.seats_filled}/{bestCohort.capacity} seats
                            </span>
                          )}
                        </div>

                        {/* Price + CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div>
                            {bestCohort ? (
                              <p className="font-heading text-xl font-bold">
                                {formatCurrency(
                                  bestCohort.price,
                                  bestCohort.currency
                                )}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Coming soon
                              </p>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-500 group-hover:gap-2 transition-all">
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold mb-2">
                No courses yet
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We&apos;re working on exciting new courses. Check back soon!
              </p>
            </div>
          )}
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
