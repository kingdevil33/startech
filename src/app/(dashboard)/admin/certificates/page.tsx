import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Award, Search, ExternalLink, XCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, sanitizeSearchTerm } from "@/lib/utils";
import { RevokeButton } from "./revoke-button";

export const metadata: Metadata = { title: "Admin — Certificates" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCertificatesPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("certificates")
    .select(
      `*,
      user:profiles!certificates_user_id_fkey (full_name, email)`,
      { count: "exact" }
    )
    .order("issued_at", { ascending: false })
    .limit(100);

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    query = query.or(
      `certificate_number.ilike.%${term}%,student_name.ilike.%${term}%,course_title.ilike.%${term}%`
    );
  }

  const { data: certificates, count } = await query;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Certificates
          </h1>
          <p className="text-muted-foreground mt-1">{count || 0} issued</p>
        </div>
        <form method="get" className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Search by number / student..."
            className="pl-10 bg-muted/50 border-none"
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Certificate #</th>
              <th className="pb-3 font-semibold text-muted-foreground">Student</th>
              <th className="pb-3 font-semibold text-muted-foreground">Course</th>
              <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground">Issued</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certificates?.map((cert) => (
              <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-mono text-xs font-medium">
                    {cert.certificate_number}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{cert.student_name}</p>
                  <p className="text-xs text-muted-foreground">{cert.user?.email}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {cert.course_title}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {cert.cohort_name}
                </td>
                <td className="py-3 pr-4">
                  {cert.is_revoked ? (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <XCircle className="h-3 w-3" />
                      Revoked
                    </Badge>
                  ) : (
                    <Badge variant="accent" className="gap-1 text-[10px]">
                      <Award className="h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {formatDate(cert.issued_at)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {cert.pdf_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {cert.linkedin_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={cert.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <RevokeButton
                      certificateId={cert.id}
                      revoked={cert.is_revoked}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!certificates || certificates.length === 0) && (
          <div className="py-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
