import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import {
  GetProductsDto,
  SortField,
  SortOrder,
  SourceType,
} from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CacheService, CacheManager } from '../../common/cache';

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;
  let cacheService: jest.Mocked<CacheService>;
  let cacheManager: jest.Mocked<CacheManager>;

  const mockProduct = {
    id: 'test-id-123',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test Description',
    image: 'https://example.com/image.jpg',
    price: '99.99',
    currency: 'USD',
    sourceUrl: 'https://example.com/product',
    amazonId: 'source-123',
    discoveredFrom: 'X_PLATFORM' as const,
    firstSeenAt: '2024-01-01',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findBySourceUrl: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getProductCategories: jest.fn(),
    getProductCategoriesWithDetails: jest.fn(),
    findLatestSocialStats: jest.fn(),
    findSocialStatsHistory: jest.fn(),
    findAppearanceStats: jest.fn(),
    findProductTrendHistory: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    exists: jest.fn(),
    getTTL: jest.fn(),
    refreshTTL: jest.fn(),
  };

  const mockCacheManager = {
    clearProductCache: jest.fn(),
    clearTrendingCache: jest.fn(),
    clearTopicCache: jest.fn(),
    clearSearchCache: jest.fn(),
    clearAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CacheManager,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(ProductRepository);
    cacheService = module.get(CacheService);
    cacheManager = module.get(CacheManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should_return_paginated_products_with_default_params', async () => {
      // Arrange
      const query: GetProductsDto = {};
      const mockResult = {
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      // Cache miss
      cacheService.get.mockResolvedValue(null);
      repository.findMany.mockResolvedValue(mockResult);

      // Act
      const result = await service.getProducts(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sourceType: undefined,
        keyword: undefined,
        sortBy: SortField.CREATED_AT,
        order: SortOrder.DESC,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      // Cache should be set
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should_return_cached_products_when_available', async () => {
      // Arrange
      const query: GetProductsDto = {};
      const cachedResult = {
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      // Cache hit
      cacheService.get.mockResolvedValue(cachedResult);

      // Act
      const result = await service.getProducts(query);

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(repository.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should_apply_pagination_bounds_correctly', async () => {
      // Arrange
      const query: GetProductsDto = { page: -1, limit: 200 };
      cacheService.get.mockResolvedValue(null);
      repository.findMany.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      });

      // Act
      await service.getProducts(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 100,
        }),
      );
    });

    it('should_filter_by_discoveredFrom', async () => {
      // Arrange
      const query: GetProductsDto = { discoveredFrom: SourceType.X_PLATFORM };
      cacheService.get.mockResolvedValue(null);
      repository.findMany.mockResolvedValue({
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Act
      await service.getProducts(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          discoveredFrom: SourceType.X_PLATFORM,
        }),
      );
    });

    it('should_filter_by_keyword', async () => {
      // Arrange
      const query: GetProductsDto = { keyword: 'test' };
      cacheService.get.mockResolvedValue(null);
      repository.findMany.mockResolvedValue({
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Act
      await service.getProducts(query);

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'test',
        }),
      );
    });
  });

  describe('getProductById', () => {
    it('should_return_product_when_found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null); // Cache miss
      repository.findById.mockResolvedValue(mockProduct);
      repository.getProductCategoriesWithDetails.mockResolvedValue([]);

      // Act
      const result = await service.getProductById('test-id-123');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('test-id-123');
      expect(result.id).toBe('test-id-123');
      expect(result.name).toBe('Test Product');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should_return_cached_product_when_available', async () => {
      // Arrange
      const cachedProduct = {
        id: 'test-id-123',
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test Description',
        image: 'https://example.com/image.jpg',
        price: '99.99',
        currency: 'USD',
        sourceUrl: 'https://example.com/product',
        amazonId: 'source-123',
        discoveredFrom: SourceType.X_PLATFORM,
        firstSeenAt: '2024-01-01',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      cacheService.get.mockResolvedValue(cachedProduct); // Cache hit

      // Act
      const result = await service.getProductById('test-id-123');

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(cachedProduct);
    });

    it('should_throw_NotFoundException_when_product_not_found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProductById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.getProductById('')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should_throw_NotFoundException_for_whitespace_only_id', async () => {
      // Act & Assert
      await expect(service.getProductById('   ')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('createProduct', () => {
    const createDto: CreateProductDto = {
      name: 'New Product',
      slug: 'new-product',
      description: 'New Description',
      image: 'https://example.com/new.jpg',
      price: '49.99',
      currency: 'USD',
      sourceUrl: 'https://example.com/new-product',
      amazonId: 'new-123',
      discoveredFrom: SourceType.AMAZON,
    };

    it('should_create_product_successfully', async () => {
      // Arrange
      repository.findBySourceUrl.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockProduct,
        name: createDto.name,
        price: '49.99',
      });

      // Act
      const result = await service.createProduct(createDto);

      // Assert
      expect(repository.findBySourceUrl).toHaveBeenCalledWith(
        createDto.sourceUrl,
      );
      expect(repository.create).toHaveBeenCalled();
      expect(result.name).toBe('New Product');
      // Cache should be cleared
      expect(cacheManager.clearProductCache).toHaveBeenCalled();
    });

    it('should_throw_ConflictException_when_sourceUrl_exists', async () => {
      // Arrange
      repository.findBySourceUrl.mockResolvedValue(mockProduct);

      // Act & Assert
      await expect(service.createProduct(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(cacheManager.clearProductCache).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
      price: '79.99',
    };

    it('should_update_product_successfully', async () => {
      // Arrange
      repository.update.mockResolvedValue({
        ...mockProduct,
        ...updateDto,
      });

      // Act
      const result = await service.updateProduct('test-id-123', updateDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith('test-id-123', {
        name: 'Updated Product',
        price: '79.99',
        description: undefined,
        image: undefined,
        currency: undefined,
      });
      expect(result.name).toBe('Updated Product');
      // Cache should be cleared
      expect(cacheManager.clearProductCache).toHaveBeenCalledWith(
        'test-id-123',
      );
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.updateProduct('', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(cacheManager.clearProductCache).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should_delete_product_successfully', async () => {
      // Arrange
      repository.delete.mockResolvedValue(mockProduct);

      // Act
      await service.deleteProduct('test-id-123');

      // Assert
      expect(repository.delete).toHaveBeenCalledWith('test-id-123');
      // Cache should be cleared
      expect(cacheManager.clearProductCache).toHaveBeenCalledWith(
        'test-id-123',
      );
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.deleteProduct('')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cacheManager.clearProductCache).not.toHaveBeenCalled();
    });
  });

  describe('productExists', () => {
    it('should_return_true_when_product_exists', async () => {
      // Arrange
      repository.exists.mockResolvedValue(true);

      // Act
      const result = await service.productExists('test-id-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should_return_false_when_product_not_exists', async () => {
      // Arrange
      repository.exists.mockResolvedValue(false);

      // Act
      const result = await service.productExists('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should_return_false_for_invalid_id', async () => {
      // Act
      const result = await service.productExists('');

      // Assert
      expect(result).toBe(false);
      expect(repository.exists).not.toHaveBeenCalled();
    });
  });

  describe('getProductSocialStats', () => {
    const mockSocialStats = {
      id: 'social-id-123',
      productId: 'test-id-123',
      statDate: '2024-01-15',
      todayRedditCount: 10,
      todayXCount: 5,
      yesterdayRedditCount: 8,
      yesterdayXCount: 3,
      thisWeekRedditCount: 50,
      thisWeekXCount: 25,
      thisMonthRedditCount: 200,
      thisMonthXCount: 100,
      last7DaysRedditCount: 70,
      last7DaysXCount: 35,
      last15DaysRedditCount: 150,
      last15DaysXCount: 75,
      last30DaysRedditCount: 300,
      last30DaysXCount: 150,
      last60DaysRedditCount: 600,
      last60DaysXCount: 300,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should_return_social_stats_when_product_exists', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findLatestSocialStats.mockResolvedValue(mockSocialStats);
      repository.findSocialStatsHistory.mockResolvedValue([mockSocialStats]);

      // Act
      const result = await service.getProductSocialStats('test-id-123');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('test-id-123');
      expect(repository.findLatestSocialStats).toHaveBeenCalledWith(
        'test-id-123',
      );
      expect(repository.findSocialStatsHistory).toHaveBeenCalledWith(
        'test-id-123',
        30,
      );
      expect(result.today.reddit).toBe(10);
      expect(result.today.x).toBe(5);
      expect(result.yesterday.reddit).toBe(8);
      expect(result.yesterday.x).toBe(3);
      expect(result.thisWeek.reddit).toBe(50);
      expect(result.thisWeek.x).toBe(25);
      expect(result.thisMonth.reddit).toBe(200);
      expect(result.thisMonth.x).toBe(100);
      expect(result.history).toHaveLength(1);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should_return_cached_stats_when_available', async () => {
      // Arrange
      const cachedStats = {
        today: { reddit: 10, x: 5 },
        yesterday: { reddit: 8, x: 3 },
        thisWeek: { reddit: 50, x: 25 },
        thisMonth: { reddit: 200, x: 100 },
        history: [{ date: '2024-01-15', reddit: 10, x: 5 }],
      };
      cacheService.get.mockResolvedValue(cachedStats);

      // Act
      const result = await service.getProductSocialStats('test-id-123');

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(cachedStats);
    });

    it('should_throw_NotFoundException_when_product_not_found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getProductSocialStats('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_return_default_values_when_no_social_stats', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findLatestSocialStats.mockResolvedValue(null);
      repository.findSocialStatsHistory.mockResolvedValue([]);

      // Act
      const result = await service.getProductSocialStats('test-id-123');

      // Assert
      expect(result.today.reddit).toBe(0);
      expect(result.today.x).toBe(0);
      expect(result.history).toHaveLength(0);
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.getProductSocialStats('')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductAppearanceStats', () => {
    const mockAppearanceStats = {
      id: 'appearance-id-123',
      productId: 'test-id-123',
      last7DaysBitmap: BigInt('0x75'), // 7 bits: 1110101
      last15DaysBitmap: BigInt('0x7FFF'), // 15 bits all 1s
      last30DaysBitmap: BigInt('0x3FFFFFFF'), // 30 bits all 1s
      last60DaysBitmap: BigInt('0xFFFFFFFFFFFFFFF'), // 60 bits all 1s
      lastUpdateDate: '2024-01-15',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should_return_appearance_stats_when_product_exists', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findAppearanceStats.mockResolvedValue(mockAppearanceStats);

      // Act
      const result = await service.getProductAppearanceStats('test-id-123');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('test-id-123');
      expect(repository.findAppearanceStats).toHaveBeenCalledWith(
        'test-id-123',
      );
      expect(result.last7DaysBitmap).toBe('1110101');
      expect(result.last30DaysBitmap).toHaveLength(30);
      expect(result.last60DaysBitmap).toHaveLength(60);
      expect(result.activeDays7).toBe(5);
      expect(result.activeDays30).toBe(30);
      expect(result.activityScore).toBe(5);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should_return_cached_stats_when_available', async () => {
      // Arrange
      const cachedStats = {
        last7DaysBitmap: '1110101',
        last30DaysBitmap: '111111111111111111111111111111',
        last60DaysBitmap:
          '111111111111111111111111111111111111111111111111111111111111',
        activeDays7: 5,
        activeDays30: 30,
        activityScore: 5,
      };
      cacheService.get.mockResolvedValue(cachedStats);

      // Act
      const result = await service.getProductAppearanceStats('test-id-123');

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(cachedStats);
    });

    it('should_throw_NotFoundException_when_product_not_found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getProductAppearanceStats('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_return_default_values_when_no_appearance_stats', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findAppearanceStats.mockResolvedValue(null);

      // Act
      const result = await service.getProductAppearanceStats('test-id-123');

      // Assert
      expect(result.last7DaysBitmap).toBe('0000000');
      expect(result.last30DaysBitmap).toBe('0'.repeat(30));
      expect(result.last60DaysBitmap).toBe('0'.repeat(60));
      expect(result.activeDays7).toBe(0);
      expect(result.activeDays30).toBe(0);
      expect(result.activityScore).toBe(0);
    });

    it('should_calculate_activity_score_correctly', async () => {
      // Arrange - 15 active days out of 30 = score 3
      const statsWith15Days = {
        ...mockAppearanceStats,
        last30DaysBitmap: BigInt('0x7FFF'), // 15 ones
      };
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findAppearanceStats.mockResolvedValue(statsWith15Days);

      // Act
      const result = await service.getProductAppearanceStats('test-id-123');

      // Assert
      expect(result.activeDays30).toBe(15);
      expect(result.activityScore).toBe(3);
    });
  });

  describe('getProductTrendHistory', () => {
    const mockTrendHistory = [
      {
        id: 'trend-id-1',
        productId: 'test-id-123',
        periodType: 'TODAY',
        statDate: '2024-01-15',
        rank: 5,
        score: 85.5,
        redditMentions: 100,
        xMentions: 50,
        sourceData: null,
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'trend-id-2',
        productId: 'test-id-123',
        periodType: 'YESTERDAY',
        statDate: '2024-01-14',
        rank: 3,
        score: 92.0,
        redditMentions: 150,
        xMentions: 75,
        sourceData: null,
        createdAt: new Date('2024-01-14'),
      },
    ];

    it('should_return_trend_history_when_product_exists', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findProductTrendHistory.mockResolvedValue(mockTrendHistory);

      // Act
      const result = await service.getProductTrendHistory('test-id-123');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('test-id-123');
      expect(repository.findProductTrendHistory).toHaveBeenCalledWith(
        'test-id-123',
      );
      expect(result.history).toHaveLength(2);
      expect(result.history[0].rank).toBe(5);
      expect(result.history[0].score).toBe(85.5);
      expect(result.history[0].redditMentions).toBe(100);
      expect(result.history[0].xMentions).toBe(50);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should_return_cached_history_when_available', async () => {
      // Arrange
      const cachedHistory = {
        history: [
          {
            date: '2024-01-15',
            periodType: 'TODAY',
            rank: 5,
            score: 85.5,
            redditMentions: 100,
            xMentions: 50,
          },
        ],
      };
      cacheService.get.mockResolvedValue(cachedHistory);

      // Act
      const result = await service.getProductTrendHistory('test-id-123');

      // Assert
      expect(cacheService.get).toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(cachedHistory);
    });

    it('should_throw_NotFoundException_when_product_not_found', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getProductTrendHistory('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_return_empty_history_when_no_trend_data', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      repository.findById.mockResolvedValue(mockProduct);
      repository.findProductTrendHistory.mockResolvedValue([]);

      // Act
      const result = await service.getProductTrendHistory('test-id-123');

      // Assert
      expect(result.history).toHaveLength(0);
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.getProductTrendHistory('')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
