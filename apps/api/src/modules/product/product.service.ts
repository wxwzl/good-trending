import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import {
  GetProductsDto,
  SortField,
  SortOrder,
  SourceType,
} from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  PaginatedProductResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { ProductSocialStatsResponseDto } from './dto/product-social-stats.dto';
import { ProductAppearanceStatsResponseDto } from './dto/product-appearance-stats.dto';
import { ProductTrendHistoryResponseDto } from './dto/product-trend-history.dto';
import {
  CacheService,
  CacheKeys,
  CacheTTLConfig,
  CacheManager,
} from '../../common/cache';

/**
 * 商品服务层
 * 负责业务逻辑处理，包含缓存优化
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cacheService: CacheService,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * 获取商品列表（分页）
   * 使用缓存优化频繁查询
   *
   * @param query 查询参数
   * @returns 分页商品列表
   */
  async getProducts(
    query: GetProductsDto,
  ): Promise<PaginatedProductResponseDto> {
    const {
      page = 1,
      limit = 10,
      discoveredFrom,
      keyword,
      sortBy = SortField.CREATED_AT,
      order = SortOrder.DESC,
    } = query;

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // 构建缓存键
    const filters = JSON.stringify({ discoveredFrom, keyword, sortBy, order });
    const cacheKey = CacheKeys.PRODUCT_LIST(safePage, safeLimit, filters);

    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<PaginatedProductResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for products list: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(
      `Fetching products: page=${safePage}, limit=${safeLimit}, discoveredFrom=${discoveredFrom}`,
    );

    const result = await this.productRepository.findMany({
      page: safePage,
      limit: safeLimit,
      discoveredFrom,
      keyword,
      sortBy,
      order,
    });

    const response: PaginatedProductResponseDto = {
      items: result.items.map(this.mapToResponseDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };

    // 缓存结果（5分钟）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.MEDIUM);

    return response;
  }

  /**
   * 根据 ID 获取商品详情
   * 使用缓存优化单个商品查询
   *
   * @param id 商品 ID
   * @returns 商品详情
   */
  async getProductById(id: string): Promise<ProductResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    const trimmedId = id.trim();
    const cacheKey = CacheKeys.PRODUCT_DETAIL(trimmedId);

    // 尝试从缓存获取
    const cached = await this.cacheService.get<ProductResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product detail: ${cacheKey}`);
      return cached;
    }

    const product = await this.productRepository.findById(trimmedId);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const response = this.mapToResponseDto(product);

    // 缓存结果（1小时）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.LONG);

    return response;
  }

  /**
   * 根据 slug 获取商品详情
   *
   * @param slug 商品 slug
   * @returns 商品详情
   */
  async getProductBySlug(slug: string): Promise<ProductResponseDto> {
    // Slug 格式验证
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new NotFoundException('Invalid product slug');
    }

    const trimmedSlug = slug.trim();
    const cacheKey = `product:slug:${trimmedSlug}`;

    // 尝试从缓存获取
    const cached = await this.cacheService.get<ProductResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product slug: ${cacheKey}`);
      return cached;
    }

    const product = await this.productRepository.findBySlug(trimmedSlug);

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    const response = this.mapToResponseDto(product);

    // 缓存结果（1小时）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.LONG);

    return response;
  }

  /**
   * 创建商品
   * 创建后清除商品列表缓存
   *
   * @param dto 创建商品 DTO
   * @returns 创建的商品
   */
  async createProduct(dto: CreateProductDto): Promise<ProductResponseDto> {
    // 检查来源 URL 是否已存在
    const existingProduct = await this.productRepository.findBySourceUrl(
      dto.sourceUrl,
    );

    if (existingProduct) {
      throw new ConflictException(
        `Product with source URL ${dto.sourceUrl} already exists`,
      );
    }

    this.logger.log(`Creating product: ${dto.name}`);

    const product = await this.productRepository.create({
      name: dto.name,
      description: dto.description,
      image: dto.image,
      price: dto.price,
      currency: dto.currency,
      sourceUrl: dto.sourceUrl,
      amazonId: dto.amazonId,
      discoveredFrom: dto.discoveredFrom,
    });

    // 清除商品列表缓存
    await this.cacheManager.clearProductCache();

    return this.mapToResponseDto(product);
  }

  /**
   * 更新商品
   * 更新后清除相关缓存
   *
   * @param id 商品 ID
   * @param dto 更新商品 DTO
   * @returns 更新后的商品
   */
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    this.logger.log(`Updating product: ${id}`);

    const product = await this.productRepository.update(id.trim(), {
      name: dto.name,
      description: dto.description,
      image: dto.image,
      price: dto.price,
      currency: dto.currency,
    });

    // 清除该商品详情缓存和列表缓存
    await this.cacheManager.clearProductCache(id.trim());

    return this.mapToResponseDto(product);
  }

  /**
   * 删除商品
   * 删除后清除相关缓存
   *
   * @param id 商品 ID
   */
  async deleteProduct(id: string): Promise<void> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    this.logger.log(`Deleting product: ${id}`);

    await this.productRepository.delete(id.trim());

    // 清除该商品详情缓存和列表缓存
    await this.cacheManager.clearProductCache(id.trim());
  }

  /**
   * 检查商品是否存在
   *
   * @param id 商品 ID
   * @returns 是否存在
   */
  async productExists(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    return this.productRepository.exists(id.trim());
  }

  /**
   * 获取商品社交统计
   *
   * @param id 商品 ID
   * @returns 社交统计数据
   */
  async getProductSocialStats(
    id: string,
  ): Promise<ProductSocialStatsResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    const trimmedId = id.trim();
    const cacheKey = `product:social-stats:${trimmedId}`;

    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<ProductSocialStatsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product social stats: ${cacheKey}`);
      return cached;
    }

    // 检查商品是否存在
    const product = await this.productRepository.findById(trimmedId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 获取最新社交统计
    const latestStats =
      await this.productRepository.findLatestSocialStats(trimmedId);

    // 获取近30天历史数据
    const history = await this.productRepository.findSocialStatsHistory(
      trimmedId,
      30,
    );

    // 构建响应
    const response: ProductSocialStatsResponseDto = {
      today: {
        reddit: latestStats?.todayRedditCount ?? 0,
        x: latestStats?.todayXCount ?? 0,
      },
      yesterday: {
        reddit: latestStats?.yesterdayRedditCount ?? 0,
        x: latestStats?.yesterdayXCount ?? 0,
      },
      thisWeek: {
        reddit: latestStats?.thisWeekRedditCount ?? 0,
        x: latestStats?.thisWeekXCount ?? 0,
      },
      thisMonth: {
        reddit: latestStats?.thisMonthRedditCount ?? 0,
        x: latestStats?.thisMonthXCount ?? 0,
      },
      history: history
        .map((stat) => ({
          date: this.formatDate(stat.statDate),
          reddit: stat.todayRedditCount,
          x: stat.todayXCount,
        }))
        .reverse(), // 按日期升序排列
    };

    // 缓存结果（10分钟）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.MEDIUM);

    return response;
  }

  /**
   * 获取商品出现统计
   *
   * @param id 商品 ID
   * @returns 出现统计数据
   */
  async getProductAppearanceStats(
    id: string,
  ): Promise<ProductAppearanceStatsResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    const trimmedId = id.trim();
    const cacheKey = `product:appearance-stats:${trimmedId}`;

    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<ProductAppearanceStatsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product appearance stats: ${cacheKey}`);
      return cached;
    }

    // 检查商品是否存在
    const product = await this.productRepository.findById(trimmedId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 获取出现统计
    const stats = await this.productRepository.findAppearanceStats(trimmedId);

    // 将 BigInt 转换为二进制字符串
    const toBitmapString = (value: bigint | null, length: number): string => {
      if (value === null) return '0'.repeat(length);
      // 转换为无符号二进制字符串
      const binary = (
        value &
        ((BigInt(1) << BigInt(length)) - BigInt(1))
      ).toString(2);
      // 补齐长度
      return binary.padStart(length, '0');
    };

    // 计算活跃天数（统计1的个数）
    const countActiveDays = (bitmap: string): number => {
      return bitmap.split('').filter((c) => c === '1').length;
    };

    // 计算活跃度评分（0-5）
    const calculateActivityScore = (activeDays30: number): number => {
      // 基于近30天活跃天数计算评分
      if (activeDays30 >= 25) return 5;
      if (activeDays30 >= 20) return 4;
      if (activeDays30 >= 15) return 3;
      if (activeDays30 >= 10) return 2;
      if (activeDays30 >= 5) return 1;
      return 0;
    };

    const bitmap7 = toBitmapString(stats?.last7DaysBitmap ?? null, 7);
    const bitmap30 = toBitmapString(stats?.last30DaysBitmap ?? null, 30);
    const bitmap60 = toBitmapString(stats?.last60DaysBitmap ?? null, 60);

    const activeDays7 = countActiveDays(bitmap7);
    const activeDays30 = countActiveDays(bitmap30);
    const activityScore = calculateActivityScore(activeDays30);

    const response: ProductAppearanceStatsResponseDto = {
      last7DaysBitmap: bitmap7,
      last30DaysBitmap: bitmap30,
      last60DaysBitmap: bitmap60,
      activeDays7,
      activeDays30,
      activityScore,
    };

    // 缓存结果（10分钟）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.MEDIUM);

    return response;
  }

  /**
   * 获取商品趋势历史
   *
   * @param id 商品 ID
   * @returns 趋势历史数据
   */
  async getProductTrendHistory(
    id: string,
  ): Promise<ProductTrendHistoryResponseDto> {
    // ID 格式验证
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new NotFoundException('Invalid product ID');
    }

    const trimmedId = id.trim();
    const cacheKey = `product:trend-history:${trimmedId}`;

    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<ProductTrendHistoryResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product trend history: ${cacheKey}`);
      return cached;
    }

    // 检查商品是否存在
    const product = await this.productRepository.findById(trimmedId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 获取趋势历史
    const history =
      await this.productRepository.findProductTrendHistory(trimmedId);

    const response: ProductTrendHistoryResponseDto = {
      history: history.map((item) => ({
        date: this.formatDate(item.statDate),
        periodType: item.periodType,
        rank: item.rank,
        score: item.score,
        redditMentions: item.redditMentions,
        xMentions: item.xMentions,
      })),
    };

    // 缓存结果（10分钟）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.MEDIUM);

    return response;
  }

  /**
   * 将数据库实体映射为响应 DTO
   */
  private mapToResponseDto(product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    price: string | null;
    currency: string;
    sourceUrl: string;
    amazonId: string;
    discoveredFrom: 'X_PLATFORM' | 'AMAZON' | 'REDDIT';
    firstSeenAt: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description ?? undefined,
      image: product.image ?? undefined,
      price: product.price ?? undefined,
      currency: product.currency,
      sourceUrl: product.sourceUrl,
      amazonId: product.amazonId,
      discoveredFrom: product.discoveredFrom as SourceType,
      firstSeenAt:
        product.firstSeenAt instanceof Date
          ? product.firstSeenAt.toISOString()
          : product.firstSeenAt,
      createdAt:
        product.createdAt instanceof Date
          ? product.createdAt.toISOString()
          : product.createdAt,
      updatedAt:
        product.updatedAt instanceof Date
          ? product.updatedAt.toISOString()
          : product.updatedAt,
    };
  }

  /**
   * 格式化日期为字符串
   */
  private formatDate(date: unknown): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return String(date);
  }
}
