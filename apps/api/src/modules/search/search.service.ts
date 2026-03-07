import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { db } from '@good-trending/database';
import { products, productTopics } from '@good-trending/database';
import { eq, ilike, or, and, desc, count, inArray } from 'drizzle-orm';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchResultItemDto,
  SearchSuggestionDto,
} from './dto/search.dto';
import { SourceType } from '@good-trending/dto';

/**
 * 搜索服务层
 * 负责商品搜索的业务逻辑处理
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  /**
   * 搜索商品
   */
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const { q, page = 1, limit = 10, sourceType, topicId } = query;

    // Validate search query
    if (!q || q.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (q.length > 100) {
      throw new BadRequestException(
        'Search query must be less than 100 characters',
      );
    }

    // Sanitize query - remove special characters that could cause issues
    const sanitizedQuery = q.trim().replace(/[<>"'%;()&+]/g, '');

    if (sanitizedQuery.length === 0) {
      throw new BadRequestException(
        'Search query contains only invalid characters',
      );
    }

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;

    this.logger.debug(
      `Searching products: q=${sanitizedQuery}, page=${safePage}, limit=${safeLimit}`,
    );

    // 构建搜索条件
    const searchConditions = [
      or(
        ilike(products.name, `%${sanitizedQuery}%`),
        ilike(products.description, `%${sanitizedQuery}%`),
      ),
    ];

    if (sourceType) {
      searchConditions.push(
        eq(
          products.sourceType,
          sourceType as (typeof SourceType)[keyof typeof SourceType],
        ),
      );
    }

    // 如果指定了分类，筛选该分类下的商品
    if (topicId) {
      const topicProducts = await db
        .select({ productId: productTopics.productId })
        .from(productTopics)
        .where(eq(productTopics.topicId, topicId));

      const productIds = topicProducts.map((tp) => tp.productId);
      if (productIds.length === 0) {
        // 返回空结果结构，由 controller 统一包装
        return {
          items: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
          query: q,
        };
      }

      // 将商品 ID 添加到搜索条件
      searchConditions.push(inArray(products.id, productIds));
    }

    // 执行搜索
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        image: products.image,
        price: products.price,
        sourceType: products.sourceType,
      })
      .from(products)
      .where(and(...searchConditions))
      .orderBy(desc(products.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // 计算相关度分数（简化版：名称匹配优先）
    const data: SearchResultItemDto[] = results.map((item) => {
      // 简单的相关度计算：名称完全匹配得高分，部分匹配得中等分
      let relevanceScore = 0.5;
      const lowerName = item.name.toLowerCase();
      const lowerQuery = sanitizedQuery.toLowerCase();

      if (lowerName === lowerQuery) {
        relevanceScore = 1.0;
      } else if (lowerName.includes(lowerQuery)) {
        relevanceScore = 0.8;
      } else if (item.description?.toLowerCase().includes(lowerQuery)) {
        relevanceScore = 0.6;
      }

      return {
        id: item.id,
        name: item.name,
        description: item.description ?? undefined,
        image: item.image ?? undefined,
        price: item.price ?? undefined,
        sourceType:
          item.sourceType as (typeof SourceType)[keyof typeof SourceType],
        relevanceScore,
      };
    });

    // 按相关度排序
    data.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 查询总数
    const totalResult = await db
      .select({ count: count() })
      .from(products)
      .where(and(...searchConditions));

    const total = totalResult[0]?.count ?? 0;

    // 返回包含 items 的对象，由 controller 统一包装为 { data: { data: items, total, ... } }
    return {
      items: data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      query: sanitizedQuery,
    };
  }

  /**
   * 获取搜索建议
   */
  async getSuggestions(keyword: string): Promise<SearchSuggestionDto[]> {
    if (!keyword || keyword.trim().length < 2) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase().trim();

    // 搜索匹配的商品名称
    const results = await db
      .select({
        name: products.name,
      })
      .from(products)
      .where(ilike(products.name, `%${lowerKeyword}%`))
      .limit(10);

    // 聚合并去重
    const suggestionMap = new Map<string, number>();

    for (const result of results) {
      const name = result.name.toLowerCase();
      // 提取包含关键词的子串作为建议
      const words = name.split(/\s+/);
      for (const word of words) {
        if (word.includes(lowerKeyword) && word.length >= 2) {
          const count = suggestionMap.get(word) ?? 0;
          suggestionMap.set(word, count + 1);
        }
      }
    }

    // 排序并返回前 5 个
    return Array.from(suggestionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({
        text,
        count,
      }));
  }
}
