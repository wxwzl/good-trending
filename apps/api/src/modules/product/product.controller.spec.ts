import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { GetProductsDto, SourceType } from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<ProductService>;

  const mockProductResponse: ProductResponseDto = {
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
    firstSeenAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPaginatedResponse = {
    items: [mockProductResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockService = {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
    getProductBySlug: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    productExists: jest.fn(),
    getProductSocialStats: jest.fn(),
    getProductAppearanceStats: jest.fn(),
    getProductTrendHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should_return_paginated_products', async () => {
      // Arrange
      const query: GetProductsDto = { page: 1, limit: 10 };
      service.getProducts.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getProducts(query);

      // Assert
      expect(service.getProducts).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should_pass_query_params_to_service', async () => {
      // Arrange
      const query: GetProductsDto = {
        page: 2,
        limit: 20,
        discoveredFrom: SourceType.AMAZON,
        keyword: 'test',
      };
      service.getProducts.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getProducts(query);

      // Assert
      expect(service.getProducts).toHaveBeenCalledWith(query);
    });
  });

  describe('getProductById', () => {
    it('should_return_product_by_id', async () => {
      // Arrange
      service.getProductById.mockResolvedValue(mockProductResponse);

      // Act
      const result = await controller.getProductById('test-id-123');

      // Assert
      expect(service.getProductById).toHaveBeenCalledWith('test-id-123');
      expect(result).toEqual(mockProductResponse);
    });
  });

  describe('createProduct', () => {
    const createDto: CreateProductDto = {
      name: 'New Product',
      slug: 'new-product',
      sourceUrl: 'https://example.com/new',
      amazonId: 'new-123',
      discoveredFrom: SourceType.AMAZON,
    };

    it('should_create_product_and_return_result', async () => {
      // Arrange
      service.createProduct.mockResolvedValue({
        ...mockProductResponse,
        name: createDto.name,
      });

      // Act
      const result = await controller.createProduct(createDto);

      // Assert
      expect(service.createProduct).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe('New Product');
    });
  });

  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
    };

    it('should_update_product_and_return_result', async () => {
      // Arrange
      service.updateProduct.mockResolvedValue({
        ...mockProductResponse,
        name: 'Updated Product',
      });

      // Act
      const result = await controller.updateProduct('test-id-123', updateDto);

      // Assert
      expect(service.updateProduct).toHaveBeenCalledWith(
        'test-id-123',
        updateDto,
      );
      expect(result.name).toBe('Updated Product');
    });
  });

  describe('deleteProduct', () => {
    it('should_delete_product', async () => {
      // Arrange
      service.deleteProduct.mockResolvedValue(undefined);

      // Act
      await controller.deleteProduct('test-id-123');

      // Assert
      expect(service.deleteProduct).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('getProductSocialStats', () => {
    const mockSocialStats = {
      today: { reddit: 10, x: 5 },
      yesterday: { reddit: 8, x: 3 },
      thisWeek: { reddit: 50, x: 25 },
      thisMonth: { reddit: 200, x: 100 },
      history: [
        { date: '2024-01-15', reddit: 10, x: 5 },
        { date: '2024-01-14', reddit: 8, x: 3 },
      ],
    };

    it('should_return_social_stats', async () => {
      // Arrange
      service.getProductSocialStats.mockResolvedValue(mockSocialStats);

      // Act
      const result = await controller.getProductSocialStats('test-id-123');

      // Assert
      expect(service.getProductSocialStats).toHaveBeenCalledWith('test-id-123');
      expect(result).toEqual(mockSocialStats);
    });

    it('should_pass_product_id_to_service', async () => {
      // Arrange
      service.getProductSocialStats.mockResolvedValue(mockSocialStats);

      // Act
      await controller.getProductSocialStats('product-456');

      // Assert
      expect(service.getProductSocialStats).toHaveBeenCalledWith('product-456');
    });
  });

  describe('getProductAppearanceStats', () => {
    const mockAppearanceStats = {
      last7DaysBitmap: '1110101',
      last30DaysBitmap: '111111111111111111111111111111',
      last60DaysBitmap:
        '111111111111111111111111111111111111111111111111111111111111',
      activeDays7: 5,
      activeDays30: 25,
      activityScore: 4.2,
    };

    it('should_return_appearance_stats', async () => {
      // Arrange
      service.getProductAppearanceStats.mockResolvedValue(mockAppearanceStats);

      // Act
      const result = await controller.getProductAppearanceStats('test-id-123');

      // Assert
      expect(service.getProductAppearanceStats).toHaveBeenCalledWith(
        'test-id-123',
      );
      expect(result).toEqual(mockAppearanceStats);
    });

    it('should_pass_product_id_to_service', async () => {
      // Arrange
      service.getProductAppearanceStats.mockResolvedValue(mockAppearanceStats);

      // Act
      await controller.getProductAppearanceStats('product-456');

      // Assert
      expect(service.getProductAppearanceStats).toHaveBeenCalledWith(
        'product-456',
      );
    });
  });

  describe('getProductTrendHistory', () => {
    const mockTrendHistory = {
      history: [
        {
          date: '2024-01-15',
          periodType: 'TODAY',
          rank: 5,
          score: 85.5,
          redditMentions: 100,
          xMentions: 50,
        },
        {
          date: '2024-01-14',
          periodType: 'YESTERDAY',
          rank: 3,
          score: 92.0,
          redditMentions: 150,
          xMentions: 75,
        },
      ],
    };

    it('should_return_trend_history', async () => {
      // Arrange
      service.getProductTrendHistory.mockResolvedValue(mockTrendHistory);

      // Act
      const result = await controller.getProductTrendHistory('test-id-123');

      // Assert
      expect(service.getProductTrendHistory).toHaveBeenCalledWith(
        'test-id-123',
      );
      expect(result).toEqual(mockTrendHistory);
    });

    it('should_pass_product_id_to_service', async () => {
      // Arrange
      service.getProductTrendHistory.mockResolvedValue(mockTrendHistory);

      // Act
      await controller.getProductTrendHistory('product-456');

      // Assert
      expect(service.getProductTrendHistory).toHaveBeenCalledWith(
        'product-456',
      );
    });
  });
});
