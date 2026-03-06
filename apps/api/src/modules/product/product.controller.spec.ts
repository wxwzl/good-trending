import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { GetProductsDto, SourceType } from './dto/get-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<ProductService>;

  const mockProductResponse = {
    id: 'test-id-123',
    name: 'Test Product',
    description: 'Test Description',
    image: 'https://example.com/image.jpg',
    price: '99.99',
    currency: 'USD',
    sourceUrl: 'https://example.com/product',
    sourceId: 'source-123',
    sourceType: SourceType.X_PLATFORM,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPaginatedResponse = {
    data: [mockProductResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockService = {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    productExists: jest.fn(),
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
        sourceType: SourceType.AMAZON,
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
      sourceUrl: 'https://example.com/new',
      sourceId: 'new-123',
      sourceType: SourceType.AMAZON,
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
});
