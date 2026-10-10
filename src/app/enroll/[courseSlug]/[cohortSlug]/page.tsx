import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Star,
  Clock,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EnrollForm } from "./enroll-form";
import { enrollAction } from "@/app/(dashboard)/dashboard/courses/[courseSlug]/enroll/actions";

type Props = {
  params: Promise<{ courseSlug: string; cohortSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  return {
    title: `Enroll — ${courseSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
  };
}

export default async function EnrollPage({ params }: Props) {
  const { courseSlug, cohortSlug } = await params;
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/enroll/${courseSlug}/${cohortSlug}`);
  }

  // Fetch course and cohort
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, description, thumbnail_url, estimated_duration_weeks")
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("*")
    .eq("slug", cohortSlug)
    .eq("course_id", course.id)
    .single();

  if (!cohort) notFound();

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("cohort_id", cohort.id)
    .in("status", ["active", "reserved", "completed"])
    .single();

  const isAlreadyEnrolled = !!existingEnrollment;
  const isEnrollmentOpen = cohort.status === "enrollment_open";
  const isFull = cohort.seats_filled >= cohort.capacity;
  const seatsLeft = cohort.capacity - cohort.seats_filled;

  return (
    <div className="min-h-screen bg-background">
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
          <ThemeToggle />
        </div>
      </nav>

      <div className="pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={`/courses/${courseSlug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Link>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Enrollment form (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
                  Complete Your Enrollment
                </h1>
                <p className="text-muted-foreground mt-1">
                  You&apos;re enrolling in{" "}
                  <span className="font-medium text-foreground">
                    {course.title}
                  </span>
                </p>
              </div>

              {isAlreadyEnrolled ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-accent-500 mx-auto mb-4" />
                  <h2 className="font-heading text-xl font-bold mb-2">
                    Already Enrolled!
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    You&apos;re already enrolled in this cohort.
                  </p>
                  <Button variant="accent" asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </Card>
              ) : !isEnrollmentOpen ? (
                <Card className="p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-heading text-xl font-bold mb-2">
                    Enrollment Closed
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Enrollment for this cohort is not currently open.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/courses">Browse Other Courses</Link>
                  </Button>
                </Card>
              ) : isFull ? (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-heading text-xl font-bold mb-2">
                    Cohort Full
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    All seats have been filled. Check out other available cohorts.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href={`/courses/${courseSlug}`}>View Other Cohorts</Link>
                  </Button>
                </Card>
              ) : (
                <EnrollForm
                  cohortId={cohort.id}
                  price={cohort.price}
                  currency={cohort.currency}
                  hasCoupons={
                    Array.isArray(cohort.coupon_codes) &&
                    cohort.coupon_codes.length > 0
                  }
                  action={enrollAction}
                />
              )}
            </div>

            {/* Right: Order summary (2 cols) */}
            <div className="lg:col-span-2">
              <Card className="sticky top-20 overflow-hidden">
                <div className="bg-primary-600/10 p-5">
                  <h3 className="font-heading font-semibold">
                    Order Summary
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {cohort.name}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Starts
                      </span>
                      <span className="font-medium">
                        {formatDate(cohort.starts_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Duration
                      </span>
                      <span className="font-medium">
                        {course.estimated_duration_weeks} weeks
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Seats left
                      </span>
                      <span className="font-medium text-accent-500">
                        {seatsLeft} of {cohort.capacity}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-lg font-heading font-bold">
                    <span>Total</span>
                    <span>
                      {formatCurrency(cohort.price, cohort.currency)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
