"use client";

import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type ServerAction = (
  formData: FormData
) => Promise<{ success?: boolean; error?: string }>;

interface ActionButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  action: ServerAction;
  fields?: Record<string, string>;
  confirmMessage?: string;
  successMessage?: string;
  children: ReactNode;
}

export function ActionButton({
  action,
  fields,
  confirmMessage,
  successMessage,
  children,
  ...props
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const formData = new FormData();
    Object.entries(fields || {}).forEach(([key, value]) =>
      formData.set(key, value)
    );

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (successMessage) {
        toast.success(successMessage);
      }
    });
  }

  return (
    <Button
      {...props}
      type="button"
      disabled={pending || props.disabled}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}
