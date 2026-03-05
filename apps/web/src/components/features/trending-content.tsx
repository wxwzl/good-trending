"use client";

import { useState } from "react";
import { ProductCard } from "@/components/features/product-card";
import { TrendingFilters } from "@/components/features/trending-filters";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type TimeFilter = "all" | "today" | "week" | "month";

// Placeholder data - will be replaced with API data
const placeholderProducts = [
  {
    id: "1",
    name: "Wireless Bluetooth Earbuds with Noise Cancellation",
    slug: "wireless-bluetooth-earbuds-1",
    image: undefined,
    price: 79.99,
    currency: "$",
    rating: 4.5,
    reviewCount: 1234,
    source: "amazon" as const,
    trendingScore: 95,
    rank: 1,
  },
  {
    id: "2",
    name: "Smart Watch Fitness Tracker",
    slug: "smart-watch-fitness-tracker-2",
    image: undefined,
    price: 149.99,
    currency: "$",
    rating: 4.3,
    reviewCount: 856,
    source: "amazon" as const,
    trendingScore: 88,
    rank: 2,
  },
  {
    id: "3",
    name: "Portable Power Bank 20000mAh",
    slug: "portable-power-bank-3",
    image: undefined,
    price: 39.99,
    currency: "$",
    rating: 4.7,
    reviewCount: 2341,
    source: "x_platform" as const,
    trendingScore: 82,
    rank: 3,
  },
  {
    id: "4",
    name: "Mechanical Gaming Keyboard RGB",
    slug: "mechanical-gaming-keyboard-4",
    image: undefined,
    price: 89.99,
    currency: "$",
    rating: 4.4,
    reviewCount: 567,
    source: "amazon" as const,
    trendingScore: 78,
    rank: 4,
  },
  {
    id: "5",
    name: "USB-C Hub Multiport Adapter",
    slug: "usb-c-hub-adapter-5",
    image: undefined,
    price: 29.99,
    currency: "$",
    rating: 4.2,
    reviewCount: 1893,
    source: "x_platform" as const,
    trendingScore: 75,
    rank: 5,
  },
  {
    id: "6",
    name: "Noise Cancelling Headphones",
    slug: "noise-cancelling-headphones-6",
    image: undefined,
    price: 199.99,
    currency: "$",
    rating: 4.6,
    reviewCount: 3456,
    source: "amazon" as const,
    trendingScore: 72,
    rank: 6,
  },
  {
    id: "7",
    name: "Wireless Charging Pad",
    slug: "wireless-charging-pad-7",
    image: undefined,
    price: 24.99,
    currency: "$",
    rating: 4.1,
    reviewCount: 789,
    source: "x_platform" as const,
    trendingScore: 68,
    rank: 7,
  },
  {
    id: "8",
    name: "Laptop Stand Adjustable",
    slug: "laptop-stand-adjustable-8",
    image: undefined,
    price: 49.99,
    currency: "$",
    rating: 4.5,
    reviewCount: 432,
    source: "amazon" as const,
    trendingScore: 65,
    rank: 8,
  },
];

export function TrendingContent() {
  const t = useTranslations();
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("all");

  // Filter products based on active filter (placeholder logic)
  const filteredProducts = placeholderProducts;

  return (
    <>
      {/* Filters */}
      <div className="mb-8">
        <TrendingFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load More */}
      <div className="mt-12 flex justify-center">
        <Button variant="outline">{t("actions.loadMore")}</Button>
      </div>
    </>
  );
}
