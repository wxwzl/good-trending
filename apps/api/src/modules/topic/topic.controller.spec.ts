import { Test, TestingModule } from '@nestjs/testing';
import { TopicController } from './topic.controller';
import { TopicService } from './topic.service';
import { GetTopicsDto } from './dto/topic.dto';

describe('TopicController', () => {
  let controller: TopicController;
  let service: jest.Mocked<TopicService>;

  const mockTopicResponse = {
    id: 'topic-id-123',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
    imageUrl: 'https://example.com/topic-image.jpg',
    productCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPaginatedResponse = {
    data: [mockTopicResponse],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockService = {
    getTopics: jest.fn(),
    getTopicBySlug: jest.fn(),
    getProductsByTopic: jest.fn(),
    createTopic: jest.fn(),
    updateTopic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopicController],
      providers: [
        {
          provide: TopicService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TopicController>(TopicController);
    service = module.get(TopicService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopics', () => {
    it('should_return_paginated_topics', async () => {
      // Arrange
      const query: GetTopicsDto = { page: 1, limit: 10 };
      service.getTopics.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getTopics(query);

      // Assert
      expect(service.getTopics).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should_pass_query_params_to_service', async () => {
      // Arrange
      const query: GetTopicsDto = { page: 2, limit: 20 };
      service.getTopics.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getTopics(query);

      // Assert
      expect(service.getTopics).toHaveBeenCalledWith(query);
    });
  });

  describe('getTopicBySlug', () => {
    it('should_return_topic_by_slug', async () => {
      // Arrange
      service.getTopicBySlug.mockResolvedValue(mockTopicResponse);

      // Act
      const result = await controller.getTopicBySlug('electronics');

      // Assert
      expect(service.getTopicBySlug).toHaveBeenCalledWith('electronics');
      expect(result).toEqual(mockTopicResponse);
    });
  });

  describe('getProductsByTopic', () => {
    it('should_return_products_for_topic', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Product 1',
        description: 'Description',
        image: 'https://example.com/image.jpg',
        price: '99.99',
        currency: 'USD',
        sourceUrl: 'https://example.com/product',
        sourceId: 'source-1',
        sourceType: 'X_PLATFORM' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const mockProductsResponse = {
        topic: mockTopicResponse,
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      service.getProductsByTopic.mockResolvedValue(mockProductsResponse);

      // Act
      const result = await controller.getProductsByTopic('electronics', {
        page: 1,
        limit: 10,
      });

      // Assert
      expect(service.getProductsByTopic).toHaveBeenCalledWith('electronics', {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockProductsResponse);
    });
  });

  describe('createTopic', () => {
    const createDto = {
      name: 'New Topic',
      slug: 'new-topic',
      description: 'New topic description',
    };

    it('should_create_topic_and_return_result', async () => {
      // Arrange
      service.createTopic.mockResolvedValue({
        ...mockTopicResponse,
        name: createDto.name,
        slug: createDto.slug,
      });

      // Act
      const result = await controller.createTopic(createDto);

      // Assert
      expect(service.createTopic).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('updateTopic', () => {
    const updateDto = {
      name: 'Updated Topic',
    };

    it('should_update_topic_and_return_result', async () => {
      // Arrange
      service.updateTopic.mockResolvedValue({
        ...mockTopicResponse,
        name: 'Updated Topic',
      });

      // Act
      const result = await controller.updateTopic('electronics', updateDto);

      // Assert
      expect(service.updateTopic).toHaveBeenCalledWith(
        'electronics',
        updateDto,
      );
      expect(result.name).toBe('Updated Topic');
    });
  });
});
