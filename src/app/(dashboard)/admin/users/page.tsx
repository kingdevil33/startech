import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { UserCog, Search, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, sanitizeSearchTerm } from "@/lib/utils";
import { ActionButton } from "../action-button";
import { toggleUserActiveAction } from "../actions";
import { RoleCell } from "./role-cell";
import { CreateTeacherForm } from "./create-teacher-form";

export const metadata: Metadata = { title: "Admin — Users" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data: users, count } = await query;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Users
          </h1>
          <p className="text-muted-foreground mt-1">
            {count || 0} total users
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <CreateTeacherForm />
          <form method="get" className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q || ""}
              placeholder="Search users..."
              className="pl-10 bg-muted/50 border-none"
            />
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">User</th>
              <th className="pb-3 font-semibold text-muted-foreground">Email</th>
              <th className="pb-3 font-semibold text-muted-foreground">Role</th>
              <th className="pb-3 font-semibold text-muted-foreground text-center">
                Status
              </th>
              <th className="pb-3 font-semibold text-muted-foreground">Joined</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users?.map((u) => {
              const initials =
                u.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?";
              const isSelf = u.id === user.id;

              return (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary-600 text-white text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {u.full_name || "Unnamed"}
                        </p>
                        {isSelf && (
                          <p className="text-[10px] text-muted-foreground">
                            That&apos;s you
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                  <td className="py-3 pr-4">
                    <RoleCell
                      userId={u.id}
                      role={u.role}
                      disabled={isSelf}
                    />
                  </td>
                  <td className="py-3 text-center">
                    <Badge
                      variant={u.is_active ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="py-3">
                    <ActionButton
                      action={toggleUserActiveAction}
                      fields={{
                        userId: u.id,
                        isActive: String(u.is_active),
                      }}
                      variant="ghost"
                      size="sm"
                      disabled={isSelf}
                      title={u.is_active ? "Deactivate" : "Activate"}
                      successMessage={
                        u.is_active ? "User deactivated" : "User activated"
                      }
                    >
                      <Power
                        className={
                          u.is_active
                            ? "h-4 w-4 text-muted-foreground"
                            : "h-4 w-4 text-accent-500"
                        }
                      />
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!users || users.length === 0) && (
          <div className="py-12 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
