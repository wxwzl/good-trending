import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let service: MonitoringService;

  const mockMonitoringService = {
    getSystemStats: jest.fn(),
    getCrawlerStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    service = module.get<MonitoringService>(MonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should_return_system_stats', async () => {
      // Arrange
      const mockStats = {
        timestamp: new Date().toISOString(),
        database: {
          productCount: 100,
          trendCount: 500,
          topicCount: 10,
          tagCount: 50,
          crawlerLogCount: 20,
          productHistoryCount: 200,
        },
        sources: {
          xPlatformCount: 60,
          amazonCount: 40,
        },
        trends: {
          todayCount: 10,
          weekCount: 50,
          monthCount: 200,
          avgScore: 75.5,
        },
        uptime: 3600,
        memory: {
          heapUsed: 50,
          heapTotal: 100,
          rss: 80,
        },
      };

      mockMonitoringService.getSystemStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(service.getSystemStats).toHaveBeenCalled();
    });

    it('should_handle_service_errors', async () => {
      // Arrange
      mockMonitoringService.getSystemStats.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(controller.getStats()).rejects.toThrow('Database error');
    });
  });

  describe('getCrawlerStats', () => {
    it('should_return_crawler_stats', async () => {
      // Arrange
      const mockCrawlerStats = {
        running: 2,
        completed: 100,
        failed: 5,
        lastRunTime: new Date().toISOString(),
      };

      mockMonitoringService.getCrawlerStats.mockResolvedValue(mockCrawlerStats);

      // Act
      const result = await controller.getCrawlerStats();

      // Assert
      expect(result).toEqual(mockCrawlerStats);
      expect(service.getCrawlerStats).toHaveBeenCalled();
    });

    it('should_return_null_lastRunTime_when_no_runs', async () => {
      // Arrange
      const mockCrawlerStats = {
        running: 0,
        completed: 0,
        failed: 0,
        lastRunTime: null,
      };

      mockMonitoringService.getCrawlerStats.mockResolvedValue(mockCrawlerStats);

      // Act
      const result = await controller.getCrawlerStats();

      // Assert
      expect(result.lastRunTime).toBeNull();
    });
  });
});
