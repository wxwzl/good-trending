/**
 * 商品类型定义
 */

export interface ProductQueryOptions {
  page: number;
  limit: number;
  discoveredFrom?: string;
  keyword?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ProductCreateInput {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceUrl: string;
  amazonId: string;
  discoveredFrom: string;
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
}
