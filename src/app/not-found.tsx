import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="relative">
        <span className="text-[120px] font-heading font-black text-muted/50 leading-none select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-heading font-bold text-gradient">
            Page not found
          </span>
        </div>
      </div>
      <p className="text-muted-foreground max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="javascript:history.back()">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Link>
        </Button>
        <Button variant="accent" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
