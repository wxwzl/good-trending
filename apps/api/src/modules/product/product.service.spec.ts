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

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;

  const mockProduct = {
    id: 'test-id-123',
    name: 'Test Product',
    description: 'Test Description',
    image: 'https://example.com/image.jpg',
    price: '99.99',
    currency: 'USD',
    sourceUrl: 'https://example.com/product',
    sourceId: 'source-123',
    sourceType: 'X_PLATFORM' as const,
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
    getProductTopics: jest.fn(),
    getProductTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(ProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should_return_paginated_products_with_default_params', async () => {
      // Arrange
      const query: GetProductsDto = {};
      const mockResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
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
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should_apply_pagination_bounds_correctly', async () => {
      // Arrange
      const query: GetProductsDto = { page: -1, limit: 200 };
      repository.findMany.mockResolvedValue({
        data: [],
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

    it('should_filter_by_sourceType', async () => {
      // Arrange
      const query: GetProductsDto = { sourceType: SourceType.X_PLATFORM };
      repository.findMany.mockResolvedValue({
        data: [mockProduct],
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
          sourceType: SourceType.X_PLATFORM,
        }),
      );
    });

    it('should_filter_by_keyword', async () => {
      // Arrange
      const query: GetProductsDto = { keyword: 'test' };
      repository.findMany.mockResolvedValue({
        data: [mockProduct],
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
      repository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await service.getProductById('test-id-123');

      // Assert
      expect(repository.findById).toHaveBeenCalledWith('test-id-123');
      expect(result.id).toBe('test-id-123');
      expect(result.name).toBe('Test Product');
    });

    it('should_throw_NotFoundException_when_product_not_found', async () => {
      // Arrange
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
      description: 'New Description',
      image: 'https://example.com/new.jpg',
      price: 49.99,
      currency: 'USD',
      sourceUrl: 'https://example.com/new-product',
      sourceId: 'new-123',
      sourceType: SourceType.AMAZON,
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
    });

    it('should_throw_ConflictException_when_sourceUrl_exists', async () => {
      // Arrange
      repository.findBySourceUrl.mockResolvedValue(mockProduct);

      // Act & Assert
      await expect(service.createProduct(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 79.99,
    };

    it('should_update_product_successfully', async () => {
      // Arrange
      repository.update.mockResolvedValue({
        ...mockProduct,
        ...updateDto,
        price: '79.99',
      });

      // Act
      const result = await service.updateProduct('test-id-123', updateDto);

      // Assert
      expect(repository.update).toHaveBeenCalledWith('test-id-123', {
        name: 'Updated Product',
        price: 79.99,
        description: undefined,
        image: undefined,
        currency: undefined,
      });
      expect(result.name).toBe('Updated Product');
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.updateProduct('', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
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
    });

    it('should_throw_NotFoundException_for_empty_id', async () => {
      // Act & Assert
      await expect(service.deleteProduct('')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
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
});
