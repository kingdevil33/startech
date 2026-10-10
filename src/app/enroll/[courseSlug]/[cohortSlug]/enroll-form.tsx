"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Zap, Tag, Shield, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

type EnrollAction = (
  formData: FormData
) => Promise<{ error?: string } | undefined>;

interface EnrollFormProps {
  cohortId: string;
  price: number;
  currency: string;
  hasCoupons: boolean;
  action: EnrollAction;
}

export function EnrollForm({
  cohortId,
  price,
  currency,
  hasCoupons,
  action,
}: EnrollFormProps) {
  const [coupon, setCoupon] = useState("");
  const [gateway, setGateway] = useState("paystack");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("cohortId", cohortId);
    formData.set("couponCode", coupon.trim());
    formData.set("gateway", gateway);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasCoupons && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent-500" />
            Have a coupon code?
          </h3>
          <Input
            name="couponCode"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Enter coupon code"
            className="uppercase"
            disabled={pending}
          />
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          Payment Method
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-accent-500 has-[:checked]:bg-accent-500/5">
            <input
              type="radio"
              name="gateway"
              value="paystack"
              checked={gateway === "paystack"}
              onChange={() => setGateway("paystack")}
              disabled={pending}
              className="accent-accent-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Paystack</p>
              <p className="text-xs text-muted-foreground">
                Mobile money, bank transfer, cards
              </p>
            </div>
            <Badge variant="accent" className="text-[10px]">
              Recommended
            </Badge>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-accent-500 has-[:checked]:bg-accent-500/5">
            <input
              type="radio"
              name="gateway"
              value="stripe"
              checked={gateway === "stripe"}
              onChange={() => setGateway("stripe")}
              disabled={pending}
              className="accent-accent-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Stripe</p>
              <p className="text-xs text-muted-foreground">
                Credit/debit card
              </p>
            </div>
          </label>
        </div>

        <Separator className="my-6" />

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Pay {formatCurrency(price, currency)} &amp; Enroll
        </Button>

        {error && (
          <p className="text-sm text-destructive text-center mt-3">{error}</p>
        )}

        <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          Secure payment. Your data is encrypted.
        </p>
      </Card>
    </form>
  );
}
