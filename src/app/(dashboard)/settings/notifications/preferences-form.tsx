"use client";

import { useActionState } from "react";
import { Loader2, Save, Check, Bell, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updateNotificationPreferencesAction, type NotificationState } from "./actions";
import type {
  NotificationCategory,
  NotificationPreferences,
} from "./constants";

type Props = {
  preferences: NotificationPreferences;
  labels: Record<NotificationCategory, string>;
  categories: readonly NotificationCategory[];
};

function Toggle({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-border accent-accent-500 cursor-pointer"
      />
      {label}
    </label>
  );
}

export function PreferencesForm({ preferences, labels, categories }: Props) {
  const initialState: NotificationState = {};
  const [state, formAction, isPending] = useActionState(
    updateNotificationPreferencesAction,
    initialState
  );

  const master = (
    channel: "email" | "in_app",
    category: NotificationCategory
  ) => preferences.categories[category]?.[channel];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4 text-sm text-accent-600 dark:text-accent-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {state.success}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold">Channels</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Turn a channel off to mute everything in that channel. Individual
          topics below can still be adjusted.
        </p>
        <div className="flex flex-wrap gap-6">
          <Toggle
            name="email"
            defaultChecked={preferences.email}
            label="Email notifications"
          />
          <Toggle
            name="in_app"
            defaultChecked={preferences.in_app}
            label="In-app notifications"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold">Topics</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 font-semibold text-muted-foreground">
                  Topic
                </th>
                <th className="pb-3 px-4 font-semibold text-muted-foreground text-center w-32">
                  Email
                </th>
                <th className="pb-3 pl-4 font-semibold text-muted-foreground text-center w-32">
                  In-app
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category) => {
                const emailDefault =
                  master("email", category) ?? preferences.email;
                const inAppDefault =
                  master("in_app", category) ?? preferences.in_app;
                return (
                  <tr key={category} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium">{labels[category]}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          name={`email_${category}`}
                          defaultChecked={emailDefault}
                          className="h-4 w-4 rounded border-border accent-accent-500 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-center">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          name={`in_app_${category}`}
                          defaultChecked={inAppDefault}
                          className="h-4 w-4 rounded border-border accent-accent-500 cursor-pointer"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Critical messages (payment receipts, security alerts) are always sent
          and cannot be disabled.
        </p>

        <div className="flex justify-end">
          <Button type="submit" variant="gradient" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}
