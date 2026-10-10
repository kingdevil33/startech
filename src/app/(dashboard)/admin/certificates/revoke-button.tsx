"use client";

import { useTransition } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeCertificateAction } from "../actions";

interface RevokeButtonProps {
  certificateId: string;
  revoked: boolean;
}

export function RevokeButton({ certificateId, revoked }: RevokeButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const reason = revoked
      ? ""
      : window.prompt("Reason for revoking this certificate:")?.trim() ?? "";

    if (!revoked && !reason) return;

    const formData = new FormData();
    formData.set("certificateId", certificateId);
    formData.set("reason", reason);
    formData.set("action", revoked ? "restore" : "revoke");

    startTransition(async () => {
      const result = await revokeCertificateAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          revoked ? "Certificate restored" : "Certificate revoked"
        );
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleClick}
      title={revoked ? "Restore certificate" : "Revoke certificate"}
      className={revoked ? "gap-1" : "gap-1 text-destructive hover:text-destructive"}
    >
      {revoked ? (
        <RotateCcw className="h-4 w-4" />
      ) : (
        <Ban className="h-4 w-4" />
      )}
      {revoked ? "Restore" : "Revoke"}
    </Button>
  );
}
