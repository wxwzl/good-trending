import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "shimmer" | "none";
}

const variantClasses = {
  text: "rounded",
  circular: "rounded-full",
  rectangular: "rounded-none",
  rounded: "rounded-lg",
};

const animationClasses = {
  pulse: "animate-pulse",
  shimmer: "animate-shimmer",
  none: "",
};

export function Skeleton({
  variant = "text",
  width,
  height,
  animation = "pulse",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-skeleton
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" height={16} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  hasImage?: boolean;
  imageAspectRatio?: string;
  className?: string;
}

export function SkeletonCard({
  hasImage = true,
  imageAspectRatio = "aspect-square",
  className = "",
}: SkeletonCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
      {hasImage && <Skeleton variant="rounded" className={`w-full ${imageAspectRatio}`} />}
      <div className="mt-4 space-y-3">
        <Skeleton variant="text" height={20} width="80%" />
        <Skeleton variant="text" height={16} width="60%" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton variant="text" height={20} width={60} />
          <Skeleton variant="rounded" height={16} width={48} />
        </div>
      </div>
    </div>
  );
}
