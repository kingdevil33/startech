"use client";

import { useActionState, useState } from "react";
import { User, Mail, Globe, Save, Loader2, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { updateProfileAction, type ProfileState } from "./actions";

interface ProfileFormProps {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    timezone: string;
  };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const initialState: ProfileState = {};
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState
  );

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <form action={formAction} className="space-y-8">
      {/* Success message */}
      {state.success && (
        <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4">
          <div className="flex items-center gap-2 text-sm text-accent-600 dark:text-accent-400">
            <Check className="h-4 w-4" />
            {state.success}
          </div>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Avatar section */}
      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">
          Profile Photo
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.full_name || "User"}
              />
              <AvatarFallback className="bg-primary-600 text-white text-xl font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">
              {profile.full_name || "User"}
            </p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">
          Personal Information
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                defaultValue={profile.full_name || ""}
                placeholder="Your full name"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={profile.email}
                className="pl-10 bg-muted"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio || ""}
              placeholder="Tell us a little about yourself..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="timezone"
                name="timezone"
                defaultValue={profile.timezone}
                placeholder="e.g., Africa/Accra"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button type="submit" variant="gradient" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
