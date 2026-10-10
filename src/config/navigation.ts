import {
  LayoutDashboard,
  BookOpen,
  Users,
  MessageSquare,
  ClipboardCheck,
  Bot,
  Award,
  Settings,
  Bell,
  BarChart3,
  Shield,
  CreditCard,
  Upload,
  FileText,
  UserCog,
  ScrollText,
  Video,
  Megaphone,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  children?: NavItem[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Student navigation
export const studentNav: NavSection[] = [
  {
    label: "Learn",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "My Courses", href: "/dashboard", icon: BookOpen },
      { title: "Live Sessions", href: "/dashboard/live", icon: Video },
      { title: "Certificates", href: "/dashboard/certificates", icon: Award },
    ],
  },
  {
    label: "Engage",
    items: [
      { title: "Forum", href: "/dashboard/forum", icon: MessageSquare },
      { title: "Peer Reviews", href: "/dashboard/reviews", icon: ClipboardCheck },
      { title: "AI Study Buddy", href: "/dashboard/ai-buddy", icon: Bot },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Settings", href: "/settings/profile", icon: Settings },
    ],
  },
];

// Instructor navigation
export const instructorNav: NavSection[] = [
  {
    label: "Teach",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "My Courses", href: "/manage/courses", icon: BookOpen },
      { title: "Cohorts", href: "/manage/cohorts", icon: Users },
      { title: "Upload Video", href: "/manage/upload", icon: Upload },
      { title: "Live Sessions", href: "/dashboard/live", icon: Video },
    ],
  },
  {
    label: "Review",
    items: [
      { title: "Submissions", href: "/dashboard/reviews", icon: ClipboardCheck },
      { title: "Analytics", href: "/manage/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Settings", href: "/settings/profile", icon: Settings },
    ],
  },
];

// Admin navigation
export const adminNav: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Analytics", href: "/manage/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Courses", href: "/admin/courses", icon: BookOpen },
      { title: "Cohorts", href: "/admin/cohorts", icon: Users },
      { title: "Users", href: "/admin/users", icon: UserCog },
      { title: "Enrollments", href: "/admin/enrollments", icon: FileText },
      { title: "Payments", href: "/admin/payments", icon: CreditCard },
      { title: "Refunds", href: "/admin/refunds", icon: RotateCcw },
      { title: "Certificates", href: "/admin/certificates", icon: Award },
      { title: "Announcements", href: "/admin/announcements", icon: Megaphone },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
      { title: "Settings", href: "/admin/settings", icon: Shield },
    ],
  },
];

export function getNavForRole(role: string): NavSection[] {
  switch (role) {
    case "admin":
      return adminNav;
    case "instructor":
    case "teaching_assistant":
      return instructorNav;
    case "student":
    default:
      return studentNav;
  }
}
