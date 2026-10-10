import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Star,
  ArrowRight,
  Users,
  Video,
  Calendar,
  Award,
  Target,
  Heart,
  Lightbulb,
  Shield,
  Rocket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "StarTech is a cohort-based learning platform helping the next generation of developers learn, build, and launch with live mentorship and AI-powered support.",
};

export default function AboutPage() {
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
            <Link
              href="/pricing"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link href="/about" className="text-sm text-white font-medium">
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
      <section className="bg-hero-gradient pt-28 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-6">
              <Rocket className="h-3.5 w-3.5 mr-1" />
              About StarTech
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
              We help people{" "}
              <span className="text-gradient">build real skills</span> that
              launch careers.
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              StarTech is a cohort-based learning platform for aspiring
              developers. We combine live mentorship, structured async lessons,
              peer collaboration, and an AI study buddy so learners actually
              finish what they start.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="electric" className="mb-4">
              Our Mission
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Quality tech education should be{" "}
              <span className="text-gradient">accessible</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Too many people start learning to code alone and never finish.
              Courses pile up, motivation fades, and there is no one to ask when
              things get confusing. We built StarTech to fix that.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every StarTech course runs as a cohort: a small group of learners
              moving through the same material on the same schedule, supported
              by live sessions, a private community, and an AI tutor that knows
              the course content inside out.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="inline-flex rounded-xl bg-accent-500/10 p-3 mb-3">
                <Users className="h-6 w-6 text-accent-500" />
              </div>
              <p className="font-heading text-2xl font-bold text-accent-400">
                500+
              </p>
              <p className="text-sm text-muted-foreground">Students served</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="inline-flex rounded-xl bg-electric-500/10 p-3 mb-3">
                <Award className="h-6 w-6 text-electric-500" />
              </div>
              <p className="font-heading text-2xl font-bold text-electric-500">
                95%
              </p>
              <p className="text-sm text-muted-foreground">Completion rate</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="inline-flex rounded-xl bg-blue-500/10 p-3 mb-3">
                <Star className="h-6 w-6 text-blue-500" />
              </div>
              <p className="font-heading text-2xl font-bold text-blue-500">
                4.9
              </p>
              <p className="text-sm text-muted-foreground">Average rating</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 card-hover">
              <div className="inline-flex rounded-xl bg-purple-500/10 p-3 mb-3">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
              <p className="font-heading text-2xl font-bold text-purple-500">
                24/7
              </p>
              <p className="text-sm text-muted-foreground">AI study buddy</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <Badge variant="accent" className="mb-4">
              How it works
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              From enrollment to{" "}
              <span className="text-gradient">graduation</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four simple steps take you from signing up to earning a verified
              certificate.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Enroll",
                description:
                  "Pick a cohort that fits your schedule and secure your seat. You will get instant access to your dashboard and community.",
              },
              {
                step: "02",
                icon: Video,
                title: "Learn async lessons",
                description:
                  "Work through HD video lessons and hands-on materials at your own pace between live sessions, with an AI study buddy on call.",
              },
              {
                step: "03",
                icon: Calendar,
                title: "Join live weekly sessions",
                description:
                  "Meet your cohort and instructor every week for Q&A, code-alongs, and project reviews — recorded if you cannot attend live.",
              },
              {
                step: "04",
                icon: Award,
                title: "Graduate with a certificate",
                description:
                  "Complete your lessons, assignments, and peer reviews to earn a verifiable certificate you can share on LinkedIn.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4">
                  <item.icon className="h-7 w-7" />
                </div>
                <p className="text-xs font-semibold text-accent-500 uppercase tracking-wider mb-1">
                  Step {item.step}
                </p>
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <Badge variant="electric" className="mb-4">
            Our Values
          </Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            What we <span className="text-gradient">stand for</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Target,
              title: "Outcomes over content",
              description:
                "We measure success by what learners can build and ship, not by how many videos they watch.",
              color: "text-accent-500",
              bg: "bg-accent-500/10",
            },
            {
              icon: Heart,
              title: "Community first",
              description:
                "Learning is social. Small cohorts, peer reviews, and real instructor access make the difference.",
              color: "text-electric-500",
              bg: "bg-electric-500/10",
            },
            {
              icon: Lightbulb,
              title: "Always hands-on",
              description:
                "Every module ends in something real — a project, an assignment, or a review you can learn from.",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: Shield,
              title: "Honest and transparent",
              description:
                "Clear pricing, clear certificate rules, and no tricks. What you see is what you get.",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
          ].map((value) => (
            <div
              key={value.title}
              className="group rounded-2xl border border-border bg-card p-6 card-hover"
            >
              <div
                className={`inline-flex rounded-xl ${value.bg} p-3 mb-4 group-hover:scale-110 transition-transform`}
              >
                <value.icon className={`h-6 w-6 ${value.color}`} />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Team ── */}
      <section className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <Badge variant="accent" className="mb-4">
              The Team
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Learn from <span className="text-gradient">practitioners</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our instructors are working engineers and designers who still ship
              production code — and love teaching it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Ama Mensah",
                role: "Lead Instructor — Frontend",
                bio: "Frontend engineer with 8+ years building web apps. Leads our HTML, CSS, and JavaScript cohorts.",
                initials: "AM",
              },
              {
                name: "Kwesi Boateng",
                role: "Instructor — Backend",
                bio: "Backend specialist focused on Node.js, databases, and API design. Mentors capstone projects.",
                initials: "KB",
              },
              {
                name: "Zainab Okafor",
                role: "Instructor — Full-Stack",
                bio: "Full-stack developer and curriculum lead. Designs project-based tracks from beginner to advanced.",
                initials: "ZO",
              },
              {
                name: "Daniel Owusu",
                role: "Instructor — Career & AI",
                bio: "Helps learners build portfolios, prep interviews, and use AI tools responsibly in real workflows.",
                initials: "DO",
              },
            ].map((member) => (
              <div
                key={member.name}
                className="group rounded-2xl border border-border bg-card p-6 text-center card-hover"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-accent-500/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <span className="font-heading text-2xl font-bold text-accent-500">
                    {member.initials}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-semibold mb-1">
                  {member.name}
                </h3>
                <p className="text-xs font-medium text-accent-500 uppercase tracking-wider mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Students" },
              { value: "95%", label: "Completion Rate" },
              { value: "4.9", label: "Student Rating" },
              { value: "24/7", label: "AI Study Buddy" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-3xl sm:text-4xl font-bold text-accent-400">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Ready to join the next cohort?
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse open cohorts, save your seat, and start building alongside a
            motivated group of peers.
          </p>
          <Button variant="gradient" size="xl" asChild>
            <Link href="/pricing">
              See Pricing
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
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
