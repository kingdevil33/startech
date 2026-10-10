import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, percent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Star,
  Zap,
  Calendar,
  Users,
  ArrowRight,
  HelpCircle,
  Tag,
  GraduationCap,
  CreditCard,
  RotateCcw,
  Ticket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for StarTech cohort-based courses. See open cohorts, seats left, and enrollment dates.",
};

type PricingCourse = {
  id: string;
  title: string;
  slug: string;
  level: string | null;
  estimated_duration_weeks: number;
  thumbnail_url: string | null;
  description: string | null;
};

type PricingCohort = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  capacity: number;
  seats_filled: number;
  starts_at: string;
  ends_at: string;
  enrollment_closes_at: string | null;
  status: string;
  course: PricingCourse | PricingCourse[] | null;
};

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select(
      "id, name, slug, price, currency, capacity, seats_filled, starts_at, ends_at, enrollment_closes_at, status, course:courses (id, title, slug, level, estimated_duration_weeks, thumbnail_url, description)"
    )
    .in("status", ["enrollment_open", "active"])
    .order("starts_at", { ascending: true });

  const items = ((cohorts ?? []) as PricingCohort[])
    .map((cohort) => {
      const course = Array.isArray(cohort.course)
        ? cohort.course[0]
        : cohort.course;
      if (!course) return null;
      const seatsLeft = Math.max(0, cohort.capacity - cohort.seats_filled);
      const filledPercent = percent(cohort.seats_filled, cohort.capacity);
      return { cohort, course, seatsLeft, filledPercent };
    })
    .filter(
      (item): item is { cohort: PricingCohort; course: PricingCourse; seatsLeft: number; filledPercent: number } =>
        item !== null
    );

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
            <Link
              href="/courses"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Courses
            </Link>
            <Link href="/pricing" className="text-sm text-white font-medium">
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              About
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white"
              asChild
            >
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
        <div className="absolute top-10 right-20 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-electric-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-4">
              <Tag className="h-3.5 w-3.5 mr-1" />
              Pricing
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Simple, <span className="text-gradient">transparent</span> pricing
            </h1>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">
              One price per cohort. No subscriptions, no hidden fees — just
              everything you need to learn, build, and graduate.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cohort Cards ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        {items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(({ cohort, course, seatsLeft, filledPercent }) => {
              const isOpen = cohort.status === "enrollment_open";
              const isSoldOut = seatsLeft === 0;
              return (
                <Card
                  key={cohort.id}
                  className="card-hover overflow-hidden flex flex-col"
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          {course.level || "Course"}
                        </p>
                        <h3 className="font-heading text-lg font-semibold leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {cohort.name}
                        </p>
                      </div>
                      {isSoldOut ? (
                        <Badge variant="secondary">Full</Badge>
                      ) : isOpen ? (
                        <Badge variant="enrollment_open">Enrolling</Badge>
                      ) : (
                        <Badge variant="active">In Progress</Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="font-heading text-3xl font-bold">
                        {formatCurrency(cohort.price, cohort.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        per seat
                      </span>
                    </div>

                    <div className="space-y-3 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        Starts {formatDate(cohort.starts_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        {course.estimated_duration_weeks} weeks
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className={seatsLeft <= 5 ? "text-accent-500 font-medium" : ""}>
                          {seatsLeft} of {cohort.capacity} seats left
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Seats filling up</span>
                        <span>{filledPercent}% claimed</span>
                      </div>
                      <Progress value={filledPercent} className="mb-5" />

                      {isOpen && !isSoldOut ? (
                        <Button variant="accent" className="w-full" asChild>
                          <Link
                            href={`/enroll/${course.slug}/${cohort.slug}`}
                          >
                            Enroll Now
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={`/courses/${course.slug}`}>
                            {isSoldOut ? "Join Waitlist" : "View Course"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/10 mb-4">
              <Zap className="h-7 w-7 text-accent-500" />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">
              No cohorts are open right now
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We open new cohorts regularly. Browse our courses to see what is
              coming next, or create a free account to get notified when
              enrollment opens.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="accent" asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* ── FAQ ── */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <Badge variant="electric" className="mb-4">
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              FAQ
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Frequently asked <span className="text-gradient">questions</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know before enrolling in a cohort.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6">
              <h3 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-500" />
                What is a cohort?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A cohort is a group of learners who start and finish a course
                together on a shared schedule. You get async video lessons, live
                weekly sessions, a private forum, and peer reviews — with real
                deadlines that keep you accountable.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-electric-500" />
                What is your refund policy?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you are not satisfied, request a full refund within 7 days of
                the cohort start date — as long as you have not completed more
                than 20% of the course content. Refunds are returned to your
                original payment method.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Which payment methods do you accept?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We accept cards and local payment methods through Stripe and
                Paystack. You can pay in GHS, USD, NGN, and other supported
                currencies depending on your region. All payments are securely
                processed — we never store your card details.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-amber-500" />
                Can I use a coupon or discount?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Some cohorts support coupon codes at checkout. If you have a
                valid code, enter it on the enrollment page and the discount will
                be applied before you pay.
              </p>
            </Card>

            <Card className="p-6 md:col-span-2">
              <h3 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-500" />
                How do I become eligible for a certificate?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Certificates are awarded when you meet your course&apos;s
                completion rules — typically a percentage of lessons completed,
                live session attendance, assignments submitted, and peer reviews
                finished. Each course lists its exact certificate rules on the
                course page.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-5" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Create a free account to explore lessons, or browse the full course
            catalog to find the right cohort for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/courses">
                Browse Courses
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/signup">Create Free Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <span className="font-heading text-xl font-bold">
                  Star<span className="text-accent-500">Tech</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Learn. Build. Launch. A cohort-based learning platform for the
                next generation of developers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/courses"
                    className="hover:text-foreground transition-colors"
                  >
                    Courses
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="hover:text-foreground transition-colors"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/login"
                    className="hover:text-foreground transition-colors"
                  >
                    Log in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="hover:text-foreground transition-colors"
                  >
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} StarTech. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
