import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rectangular" | "text";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function Skeleton({
  className,
  variant = "default",
  width,
  height,
  lines,
  ...props
}: SkeletonProps) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  if (variant === "text" && lines) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn("animate-pulse rounded-md bg-muted", i === lines - 1 && "w-3/4")}
            style={{ height: "1em" }}
          />
        ))}
      </div>
    );
  }

  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-none",
    text: "rounded-md",
  };

  return (
    <div
      className={cn("animate-pulse bg-muted", variantClasses[variant], className)}
      style={style}
      {...props}
    />
  );
}

// Pre-built skeleton components for common patterns
function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Skeleton variant="rectangular" height={200} className="w-full" />
      <div className="space-y-2">
        <Skeleton height={20} className="w-3/4" />
        <Skeleton height={16} className="w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton height={32} width={80} />
        <Skeleton height={32} width={80} />
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={20} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-1">
            <Skeleton height={16} className="w-3/4" />
            <Skeleton height={12} className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <Skeleton height={12} className="mb-2 w-1/3" />
          <Skeleton height={32} className="mb-1 w-1/2" />
          <Skeleton height={10} className="w-2/3" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Skeleton height={24} width={150} />
        <Skeleton height={32} width={120} />
      </div>
      <Skeleton variant="rectangular" height={300} className="w-full" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonStats, SkeletonChart };
