import { Test, TestingModule } from '@nestjs/testing';
import { TrendingController } from './trending.controller';
import { TrendingService } from './trending.service';
import { GetTrendingDto, Period } from './dto/trending.dto';

describe('TrendingController', () => {
  let controller: TrendingController;
  let service: jest.Mocked<TrendingService>;

  const mockTrendItem = {
    rank: 1,
    productId: 'product-id-123',
    productName: 'Apple AirPods Pro 2',
    productImage: 'https://example.com/image.jpg',
    productPrice: '249.99',
    score: 95.5,
    mentions: 1500,
    views: 50000,
    likes: 2500,
    date: '2024-01-01',
  };

  const mockPaginatedResponse = {
    data: [mockTrendItem],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockService = {
    getTrending: jest.fn(),
    getDailyTrending: jest.fn(),
    getWeeklyTrending: jest.fn(),
    getMonthlyTrending: jest.fn(),
    getTrendingByTopic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrendingController],
      providers: [
        {
          provide: TrendingService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TrendingController>(TrendingController);
    service = module.get(TrendingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrending', () => {
    it('should_return_trending_with_default_params', async () => {
      // Arrange
      const query: GetTrendingDto = {};
      service.getTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getTrending(query);

      // Assert
      expect(service.getTrending).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should_pass_period_filter_to_service', async () => {
      // Arrange
      const query: GetTrendingDto = { period: Period.WEEKLY };
      service.getTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getTrending(query);

      // Assert
      expect(service.getTrending).toHaveBeenCalledWith(query);
      expect(query.period).toBe(Period.WEEKLY);
    });

    it('should_pass_pagination_params_to_service', async () => {
      // Arrange
      const query: GetTrendingDto = { page: 2, limit: 20 };
      service.getTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getTrending(query);

      // Assert
      expect(service.getTrending).toHaveBeenCalledWith(query);
    });
  });

  describe('getDailyTrending', () => {
    it('should_return_daily_trending', async () => {
      // Arrange
      service.getDailyTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getDailyTrending({});

      // Assert
      expect(service.getDailyTrending).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should_pass_pagination_params', async () => {
      // Arrange
      const query = { page: 1, limit: 5 };
      service.getDailyTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getDailyTrending(query);

      // Assert
      expect(service.getDailyTrending).toHaveBeenCalledWith(query);
    });
  });

  describe('getWeeklyTrending', () => {
    it('should_return_weekly_trending', async () => {
      // Arrange
      service.getWeeklyTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getWeeklyTrending({});

      // Assert
      expect(service.getWeeklyTrending).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getMonthlyTrending', () => {
    it('should_return_monthly_trending', async () => {
      // Arrange
      service.getMonthlyTrending.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getMonthlyTrending({});

      // Assert
      expect(service.getMonthlyTrending).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPaginatedResponse);
    });
  });

  describe('getTrendingByTopic', () => {
    it('should_return_trending_for_topic', async () => {
      // Arrange
      service.getTrendingByTopic.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getTrendingByTopic('electronics', {});

      // Assert
      expect(service.getTrendingByTopic).toHaveBeenCalledWith(
        'electronics',
        {},
      );
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should_pass_query_params_to_service', async () => {
      // Arrange
      const query: GetTrendingDto = {
        page: 2,
        limit: 20,
        period: Period.MONTHLY,
      };
      service.getTrendingByTopic.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getTrendingByTopic('electronics', query);

      // Assert
      expect(service.getTrendingByTopic).toHaveBeenCalledWith(
        'electronics',
        query,
      );
    });
  });
});
