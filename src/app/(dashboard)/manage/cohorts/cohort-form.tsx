"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { createCohortAction, updateCohortAction } from "./actions";

type FormState = { success?: boolean; error?: string };

type CouponRow = {
  code: string;
  discount_percent: string;
  max_uses: string;
};

type CourseOption = { id: string; title: string };

type CohortValues = {
  id?: string;
  course_id: string;
  name: string;
  slug: string;
  description: string;
  price: number | string;
  currency: string;
  capacity: number | string;
  enrollment_opens_at: string | null;
  enrollment_closes_at: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  post_access_days: number | string;
  coupon_codes: { code: string; discount_percent: number; max_uses: number | null }[];
};

interface CohortFormProps {
  mode: "create" | "edit";
  cohort?: CohortValues;
  courses?: CourseOption[];
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local wants local time without timezone suffix
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CohortForm({ mode, cohort, courses }: CohortFormProps) {
  const action = mode === "create" ? createCohortAction : updateCohortAction;
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => action(formData),
    {} as FormState
  );

  const [coupons, setCoupons] = useState<CouponRow[]>(
    (cohort?.coupon_codes || []).map((c) => ({
      code: c.code,
      discount_percent: String(c.discount_percent),
      max_uses: c.max_uses === null || c.max_uses === undefined ? "" : String(c.max_uses),
    }))
  );

  function addCoupon() {
    setCoupons((rows) => [...rows, { code: "", discount_percent: "10", max_uses: "" }]);
  }

  function removeCoupon(index: number) {
    setCoupons((rows) => rows.filter((_, i) => i !== index));
  }

  function updateCoupon(index: number, field: keyof CouponRow, value: string) {
    setCoupons((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {cohort?.id && <input type="hidden" name="cohortId" value={cohort.id} />}
      <input
        type="hidden"
        name="coupon_codes"
        value={JSON.stringify(
          coupons
            .filter((c) => c.code.trim())
            .map((c) => ({
              code: c.code.trim(),
              discount_percent: Number(c.discount_percent) || 0,
              max_uses: c.max_uses ? Number(c.max_uses) : null,
            }))
        )}
      />

      {state.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4 text-sm text-accent-600 dark:text-accent-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          Cohort saved.
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Cohort details</h2>
        {mode === "create" && courses && (
          <div className="space-y-2">
            <Label htmlFor="course_id">Course</Label>
            <select
              id="course_id"
              name="course_id"
              required
              defaultValue={cohort?.course_id || ""}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Select a course...
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "edit" && (
          <input type="hidden" name="course_id" value={cohort?.course_id || ""} />
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Cohort name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={cohort?.name || ""}
              placeholder="January 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={cohort?.slug || ""}
              placeholder="jan-2026"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={cohort?.description || ""}
            placeholder="Optional internal notes or student-facing blurb"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={cohort?.timezone || "Africa/Accra"}
              placeholder="Africa/Accra"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post_access_days">Post-completion access (days)</Label>
            <Input
              id="post_access_days"
              name="post_access_days"
              type="number"
              min={0}
              defaultValue={cohort?.post_access_days ?? 90}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Pricing &amp; capacity</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={cohort?.price ?? 0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              required
              defaultValue={cohort?.currency || "GHS"}
              placeholder="GHS"
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (seats)</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              required
              defaultValue={cohort?.capacity ?? 50}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Schedule</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="enrollment_opens_at">Enrollment opens</Label>
            <Input
              id="enrollment_opens_at"
              name="enrollment_opens_at"
              type="datetime-local"
              defaultValue={toDateInput(cohort?.enrollment_opens_at)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrollment_closes_at">Enrollment closes</Label>
            <Input
              id="enrollment_closes_at"
              name="enrollment_closes_at"
              type="datetime-local"
              defaultValue={toDateInput(cohort?.enrollment_closes_at)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="starts_at">Starts</Label>
            <Input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              required
              defaultValue={toDateInput(cohort?.starts_at)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ends_at">Ends</Label>
            <Input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              required
              defaultValue={toDateInput(cohort?.ends_at)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Coupon codes</h2>
            <p className="text-sm text-muted-foreground">
              Optional discount codes students can apply at checkout.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addCoupon}>
            <Plus className="h-3.5 w-3.5" />
            Add coupon
          </Button>
        </div>
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coupons yet.</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Code</Label>}
                  <Input
                    value={row.code}
                    onChange={(e) => updateCoupon(index, "code", e.target.value.toUpperCase())}
                    placeholder="SAVE20"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1 w-24">
                  {index === 0 && <Label className="text-xs">% off</Label>}
                  <Input
                    value={row.discount_percent}
                    onChange={(e) => updateCoupon(index, "discount_percent", e.target.value)}
                    type="number"
                    min={1}
                    max={100}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1 w-24">
                  {index === 0 && <Label className="text-xs">Max uses</Label>}
                  <Input
                    value={row.max_uses}
                    onChange={(e) => updateCoupon(index, "max_uses", e.target.value)}
                    type="number"
                    min={1}
                    placeholder="∞"
                    className="h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCoupon(index)}
                  aria-label="Remove coupon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="accent" className="gap-2" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Create cohort" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={mode === "edit" && cohort?.id ? `/manage/cohorts/${cohort.id}` : "/manage/cohorts"}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
