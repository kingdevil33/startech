import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Star,
  Shield,
  User,
  Activity,
  CreditCard,
  Server,
  Bot,
  Cookie,
  Trash2,
  Users,
  FileText,
  Mail,
  ArrowRight,
  Download,
  PencilLine,
  Eye,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How StarTech collects, uses, and protects your personal information, learning activity, and payment data.",
};

export default function PrivacyPage() {
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

      {/* ── Header ── */}
      <section className="bg-hero-gradient pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-10 right-20 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="accent" className="mb-4">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Legal
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Privacy <span className="text-gradient">Policy</span>
            </h1>
            <p className="text-gray-300 text-lg">
              How we collect, use, and protect your information on StarTech.
            </p>
            <p className="text-sm text-gray-400 mt-3">
              Last updated: October 9, 2026
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy explains what information StarTech
              (&quot;we&quot;, &quot;us&quot;) collects when you use our website
              and learning platform, why we collect it, and the choices you
              have. By using StarTech, you agree to the practices described
              here. If you do not agree, please do not use the platform.
            </p>
          </div>

          <Separator />

          {/* Information we collect */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-accent-500" />
              Information we collect
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-medium text-foreground">
                  Account information.
                </span>{" "}
                When you create an account, we collect your email address,
                password (stored only as a secure hash), and role on the
                platform.
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Profile information.
                </span>{" "}
                You may optionally provide your full name, avatar, bio, and
                timezone. Your timezone is used to display live sessions and
                due dates correctly.
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Learning activity.
                </span>{" "}
                We track lesson progress, watch position, assignment
                submissions, peer reviews, live session attendance, forum
                posts, and AI study buddy conversations so we can deliver the
                course experience and compute certificate eligibility.
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Payment information.
                </span>{" "}
                When you enroll in a paid cohort, our payment processors collect
                the information needed to complete the transaction. We receive
                confirmation of payment, amount, currency, and status — not
                your full card details.
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Technical data.
                </span>{" "}
                We may collect standard technical information such as IP
                address, browser type, device type, and pages visited, used for
                security, debugging, and understanding how the platform is
                used.
              </p>
            </div>
          </div>

          <Separator />

          {/* How we use it */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-6 w-6 text-electric-500" />
              How we use your information
            </h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc pl-5">
              <li>
                Provide and operate the platform: authenticate you, deliver
                lessons, run live sessions, and power the discussion forum.
              </li>
              <li>
                Track your progress and compute certificate eligibility based on
                each course&apos;s published rules.
              </li>
              <li>
                Process enrollments, payments, refunds, and send transactional
                emails such as receipts and enrollment confirmations.
              </li>
              <li>
                Send service-related notifications (session reminders, cohort
                updates) and, if you opt in, marketing messages you can
                unsubscribe from at any time.
              </li>
              <li>
                Detect abuse, keep the platform secure, and troubleshoot
                problems.
              </li>
              <li>
                Improve the platform using aggregated, de-identified usage
                patterns.
              </li>
            </ul>
          </div>

          <Separator />

          {/* Payment processing */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-500" />
              Payment processing
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Payments on StarTech are processed by third-party providers —
              Stripe and Paystack, depending on your region and currency. When
              you enter payment details, they are sent directly to these
              providers over encrypted connections.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">
                We never store your card numbers, CVCs, or bank credentials on
                our servers.
              </span>{" "}
              We only keep a record of the payment itself (amount, currency,
              status, and gateway reference) so we can manage enrollments,
              refunds, and receipts.
            </p>
          </div>

          <Separator />

          {/* Supabase hosting */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Server className="h-6 w-6 text-purple-500" />
              Hosting and data location
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              StarTech is built on Supabase, which hosts our database,
              authentication, and file storage. Data is stored on secure cloud
              infrastructure with encryption in transit and at rest.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your region and Supabase project configuration, your
              data may be processed and stored in data centers outside your
              country of residence. By using StarTech, you understand that your
              information may be transferred to and processed in these
              locations under appropriate safeguards.
            </p>
          </div>

          <Separator />

          {/* AI features */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Bot className="h-6 w-6 text-cyan-500" />
              AI features
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              StarTech includes an AI study buddy to help you understand course
              material. When you use this feature, relevant excerpts of the
              course content and your questions are sent to a third-party large
              language model (LLM) provider to generate answers.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your conversations. Please avoid sharing sensitive
              personal information in your questions to the AI study buddy, as
              those messages are processed by our LLM provider to generate a
              response.
            </p>
          </div>

          <Separator />

          {/* Cookies */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Cookie className="h-6 w-6 text-amber-500" />
              Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use a small number of cookies and similar storage mechanisms:
            </p>
            <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc pl-5">
              <li>
                <span className="font-medium text-foreground">
                  Authentication cookies.
                </span>{" "}
                Keep you signed in securely between visits.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Theme preference.
                </span>{" "}
                Remembers whether you use light or dark mode.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not use third-party advertising cookies.
            </p>
          </div>

          <Separator />

          {/* Data retention */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent-500" />
              Data retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We keep your account and learning data for as long as your
              account is active, so you can continue where you left off and
              access your certificates. If your account is deleted, we remove
              or de-identify your personal data within a reasonable period,
              except where we are required to retain limited records (for
              example, payment and transaction records for accounting and legal
              compliance).
            </p>
          </div>

          <Separator />

          {/* Your rights */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <User className="h-6 w-6 text-electric-500" />
              Your rights and choices
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-accent-500" />
                  <h3 className="font-heading font-semibold">Access</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can review your account and profile information anytime
                  from your dashboard settings.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-blue-500" />
                  <h3 className="font-heading font-semibold">Export</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can request an export of your personal data from Settings
                  → Privacy.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <PencilLine className="h-5 w-5 text-electric-500" />
                  <h3 className="font-heading font-semibold">Correction</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can update your profile details (name, bio, avatar,
                  timezone) at any time in your settings.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <h3 className="font-heading font-semibold">Deletion</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can request deletion of your account and associated
                  personal data, subject to limited legal retention
                  requirements.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-6">
              To make a privacy request, contact us using the details below. We
              will respond within a reasonable timeframe.
            </p>
          </div>

          <Separator />

          {/* Children's privacy */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-500" />
              Children&apos;s privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              StarTech is not directed at children under 13 (or the minimum age
              required in your jurisdiction). We do not knowingly collect
              personal information from children. If you believe a child has
              provided us with personal information, please contact us and we
              will take steps to delete it.
            </p>
          </div>

          <Separator />

          {/* Changes */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-500" />
              Changes to this policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. When we do,
              we will revise the &quot;Last updated&quot; date at the top of
              this page. Material changes will be highlighted on the platform
              or communicated by email. Continued use of StarTech after changes
              take effect means you accept the updated policy.
            </p>
          </div>

          <Separator />

          {/* Contact */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-accent-500" />
              Contact us
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you have questions about this Privacy Policy or how we handle
              your data, reach out to us. We read every message and will get
              back to you as soon as we can.
            </p>
            <Button variant="accent" asChild>
              <Link href="/">
                Contact the StarTech team
                <ArrowRight className="h-4 w-4" />
              </Link>
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
