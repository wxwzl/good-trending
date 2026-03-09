import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";

interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  source: "x_platform" | "amazon";
  trendingScore?: number;
  rank?: number;
}

interface ProductCardProps {
  product: ProductCardProduct;
  showRank?: boolean;
  showSource?: boolean;
}

const sourceLabels = {
  x_platform: "X",
  amazon: "Amazon",
};

const sourceVariants = {
  x_platform: "info" as const,
  amazon: "warning" as const,
};

export function ProductCard({ product, showRank = true, showSource = true }: ProductCardProps) {
  return (
    <Link href={`/product/${product.slug}`}>
      <Card padding="none" hoverable className="group overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}

          {/* Rank Badge */}
          {showRank && product.rank && (
            <div className="absolute left-2 top-2">
              <Badge variant="default" size="sm">
                #{product.rank}
              </Badge>
            </div>
          )}

          {/* Source Badge */}
          {showSource && (
            <div className="absolute right-2 top-2">
              <Badge variant={sourceVariants[product.source]} size="sm">
                {sourceLabels[product.source]}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Name */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{product.name}</h3>

          {/* Price & Rating */}
          <div className="flex items-center justify-between">
            {product.price !== undefined && (
              <span className="font-bold text-lg">
                {product.currency || "$"}
                {product.price.toFixed(2)}
              </span>
            )}

            {product.rating !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-warning"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{product.rating.toFixed(1)}</span>
                {product.reviewCount && <span className="text-xs">({product.reviewCount})</span>}
              </div>
            )}
          </div>

          {/* Trending Score */}
          {product.trendingScore !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-success"
              >
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              <span>Score: {product.trendingScore}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
