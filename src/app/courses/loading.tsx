import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function CoursesLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="bg-hero-gradient pt-28 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Skeleton className="h-6 w-48 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-12 w-96 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-5 w-80 mx-auto bg-white/10" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between pt-4 border-t border-border">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
