import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';

// Mock the database module
jest.mock('@good-trending/database', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  },
}));

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  describe('getSystemStats', () => {
    it('should_be_defined', () => {
      expect(service).toBeDefined();
    });

    it('should_return_system_stats_with_memory_info', async () => {
      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.memory.heapUsed).toBeDefined();
      expect(result.memory.heapTotal).toBeDefined();
      expect(result.memory.rss).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });

    it('should_return_database_stats_structure', async () => {
      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.database).toBeDefined();
      expect(typeof result.database.productCount).toBe('number');
      expect(typeof result.database.trendCount).toBe('number');
      expect(typeof result.database.topicCount).toBe('number');
      expect(typeof result.database.tagCount).toBe('number');
    });

    it('should_return_source_stats_structure', async () => {
      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.sources).toBeDefined();
      expect(typeof result.sources.xPlatformCount).toBe('number');
      expect(typeof result.sources.amazonCount).toBe('number');
    });

    it('should_return_trend_stats_structure', async () => {
      // Act
      const result = await service.getSystemStats();

      // Assert
      expect(result.trends).toBeDefined();
      expect(typeof result.trends.todayCount).toBe('number');
      expect(typeof result.trends.weekCount).toBe('number');
      expect(typeof result.trends.monthCount).toBe('number');
      expect(typeof result.trends.avgScore).toBe('number');
    });
  });

  describe('getCrawlerStats', () => {
    it('should_return_crawler_stats_structure', async () => {
      // Act
      const result = await service.getCrawlerStats();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result.running).toBe('number');
      expect(typeof result.completed).toBe('number');
      expect(typeof result.failed).toBe('number');
      // lastRunTime can be null or string
      expect(
        result.lastRunTime === null || typeof result.lastRunTime === 'string',
      ).toBe(true);
    });
  });
});
