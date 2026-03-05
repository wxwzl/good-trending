/**
 * 商品类型定义
 */

export interface ProductQueryOptions {
  page: number;
  limit: number;
  sourceType?: string;
  keyword?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: string;
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
}
