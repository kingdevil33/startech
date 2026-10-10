import Link from "next/link";
import { Star } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Auth form */}
      <div className="flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold">
              Star<span className="text-accent-500">Tech</span>
            </span>
          </Link>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right: Branded panel (hidden on mobile) */}
      <div className="hidden lg:flex bg-hero-gradient relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-5" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-60 h-60 bg-electric-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col items-center justify-center p-12 text-center">
          <h2 className="font-heading text-4xl font-bold text-white mb-4">
            Learn. Build.{" "}
            <span className="text-gradient">Launch.</span>
          </h2>
          <p className="text-gray-300 max-w-md mb-12 leading-relaxed">
            Join a cohort of motivated learners and master web development
            through live sessions, peer reviews, and AI-powered support.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-6 max-w-sm">
            {[
              { value: "500+", label: "Students" },
              { value: "95%", label: "Completion Rate" },
              { value: "4.9★", label: "Average Rating" },
              { value: "24/7", label: "AI Study Buddy" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4">
                <p className="font-heading text-2xl font-bold text-accent-400">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
