/**
 * Custom hooks for data fetching
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { getProduct, listProducts } from "@/api/product";
import { listTopics, getTopic, getTopicProducts } from "@/api/topic";
import {
  listTrending,
  getDailyTrending,
  getWeeklyTrending,
  getMonthlyTrending,
} from "@/api/trending";
import { searchProducts } from "@/api/search";
import type { Product, Topic, TrendingItem, PaginatedResponse } from "@/api/types";

// ============================================
// Generic hook for async data fetching
// ============================================

interface AsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []): AsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }

    setLoading(false);
  }, [asyncFn]);

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}

// ============================================
// Product hooks
// ============================================

export function useProduct(id: string): AsyncResult<Product> {
  return useAsync(() => getProduct(id), [id]);
}

export function useProducts(params: {
  page?: number;
  limit?: number;
  sourceType?: string;
  topicId?: string;
}): AsyncResult<PaginatedResponse<Product>> {
  return useAsync(
    () => listProducts(params),
    [params.page, params.limit, params.sourceType, params.topicId]
  );
}

// ============================================
// Trending hooks
// ============================================

export function useTrending(params?: {
  page?: number;
  limit?: number;
  period?: "daily" | "weekly" | "monthly";
}): AsyncResult<PaginatedResponse<TrendingItem>> {
  return useAsync(() => listTrending(params), [params?.page, params?.limit, params?.period]);
}

export function useDailyTrending(params?: {
  page?: number;
  limit?: number;
}): AsyncResult<PaginatedResponse<TrendingItem>> {
  return useAsync(() => getDailyTrending(params), [params?.page, params?.limit]);
}

export function useWeeklyTrending(params?: {
  page?: number;
  limit?: number;
}): AsyncResult<PaginatedResponse<TrendingItem>> {
  return useAsync(() => getWeeklyTrending(params), [params?.page, params?.limit]);
}

export function useMonthlyTrending(params?: {
  page?: number;
  limit?: number;
}): AsyncResult<PaginatedResponse<TrendingItem>> {
  return useAsync(() => getMonthlyTrending(params), [params?.page, params?.limit]);
}

// ============================================
// Search hooks
// ============================================

export function useSearchProducts(
  query: string,
  params?: { page?: number; limit?: number }
): AsyncResult<PaginatedResponse<Product>> {
  return useAsync(
    () =>
      query
        ? searchProducts({ q: query, ...params })
        : Promise.resolve({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    [query, params?.page, params?.limit]
  );
}

// ============================================
// Topic hooks
// ============================================

export function useTopics(): AsyncResult<PaginatedResponse<Topic>> {
  return useAsync(() => listTopics(), []);
}

export function useTopic(slug: string): AsyncResult<Topic> {
  return useAsync(() => getTopic(slug), [slug]);
}

export function useTopicProducts(
  slug: string,
  params?: { page?: number; limit?: number }
): AsyncResult<PaginatedResponse<Product>> {
  return useAsync(() => getTopicProducts(slug, params), [slug, params?.page, params?.limit]);
}

// ============================================
// Utility hooks
// ============================================

export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    offset: (currentPage - 1) * itemsPerPage,
  };
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
