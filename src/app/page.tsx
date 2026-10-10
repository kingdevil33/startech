import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  ArrowRight,
  Play,
  Users,
  Video,
  MessageSquare,
  Bot,
  Award,
  ClipboardCheck,
  Star,
  Zap,
  Globe,
  Calendar,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ---- NAVBAR ---- */}
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
            <Link
              href="/about"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
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

      {/* ---- HERO ---- */}
      <section className="relative bg-hero-gradient pt-32 pb-20 overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge
              variant="accent"
              className="mb-6 px-4 py-1.5 text-sm font-medium"
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              Cohort-Based Learning Platform
            </Badge>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Learn. Build.{" "}
              <span className="text-gradient">Launch.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join a cohort of motivated learners. Master web development through
              live sessions, async video lessons, peer reviews, and an AI study
              buddy — all on a shared schedule.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="gradient"
                size="xl"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/courses">
                  Browse Courses
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/courses">
                  <Play className="h-5 w-5" />
                  Watch Demo
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { value: "500+", label: "Students" },
                { value: "95%", label: "Completion Rate" },
                { value: "4.9", label: "Student Rating" },
                { value: "24/7", label: "AI Study Buddy" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-heading text-3xl font-bold text-accent-400">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="electric" className="mb-4">How it works</Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="text-gradient">succeed</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform combines the best of live and async learning with
              peer collaboration and AI assistance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Cohort-Based Learning",
                description:
                  "Learn with a group of peers on a shared schedule. Build connections and stay accountable.",
                color: "text-accent-500",
                bg: "bg-accent-500/10",
              },
              {
                icon: Video,
                title: "HD Video Lessons",
                description:
                  "Professional video lessons with speed control, captions, and resume-watching support.",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Calendar,
                title: "Live Sessions",
                description:
                  "Join live Q&A sessions on Zoom, YouTube, or TikTok with timezone-aware scheduling.",
                color: "text-electric-500",
                bg: "bg-electric-500/10",
              },
              {
                icon: MessageSquare,
                title: "Discussion Forum",
                description:
                  "Private cohort forum with threads, code blocks, reactions, and real-time updates.",
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
              {
                icon: ClipboardCheck,
                title: "Peer Reviews",
                description:
                  "Submit assignments, review peers' work with rubrics, and get actionable feedback.",
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
              {
                icon: Bot,
                title: "AI Study Buddy",
                description:
                  "Get instant answers from an AI tutor trained on your course content. With source citations.",
                color: "text-cyan-500",
                bg: "bg-cyan-500/10",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 card-hover"
              >
                <div
                  className={`inline-flex rounded-xl ${feature.bg} p-3 mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section className="py-24 bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="accent" className="mb-4">Your Journey</Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              From enrollment to{" "}
              <span className="text-gradient">certification</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Enroll",
                description:
                  "Choose a cohort that fits your schedule and secure your seat.",
              },
              {
                step: "02",
                title: "Learn",
                description:
                  "Watch lessons, attend live sessions, and ask the AI buddy questions.",
              },
              {
                step: "03",
                title: "Build",
                description:
                  "Complete assignments, get peer feedback, and build your portfolio.",
              },
              {
                step: "04",
                title: "Certify",
                description:
                  "Earn a verified certificate and share it on LinkedIn.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white font-heading text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-24 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-5" />
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-accent-500/15 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Award className="h-8 w-8 text-accent-400" />
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Join the next cohort and learn alongside motivated peers with live
            mentorship and AI-powered support.
          </p>
          <Button variant="gradient" size="xl" asChild>
            <Link href="/courses">
              Explore Courses
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
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
                <li><Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors flex items-center gap-2"><Globe className="h-4 w-4" /> Website</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Community</Link></li>
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
