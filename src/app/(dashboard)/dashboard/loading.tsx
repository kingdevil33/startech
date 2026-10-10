import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Content area */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex gap-4">
                <Skeleton className="w-40 h-24 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-2 w-full rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
