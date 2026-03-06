import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { CacheService } from '../../common/cache';

// Mock the database module
jest.mock('@good-trending/database', () => ({
  databaseHealthCheck: jest.fn(),
  getPoolStatus: jest.fn(),
  redisHealthCheck: jest.fn(),
}));

import {
  databaseHealthCheck,
  getPoolStatus,
  redisHealthCheck,
} from '@good-trending/database';

describe('HealthController', () => {
  let controller: HealthController;

  const mockCacheService = {
    getConnectionStatus: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should_return_basic_health_status', () => {
      // Act
      const result = controller.check();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should_return_valid_iso_timestamp', () => {
      // Act
      const result = controller.check();

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('checkDetailed', () => {
    it('should_return_detailed_health_status_with_all_services_ok', async () => {
      // Arrange
      (databaseHealthCheck as jest.Mock).mockResolvedValue({
        status: 'ok',
        latency: 5,
      });
      (redisHealthCheck as jest.Mock).mockResolvedValue({
        status: 'ok',
        latency: 2,
      });
      (getPoolStatus as jest.Mock).mockReturnValue({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });

      // Act
      const result = await controller.checkDetailed();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.services.database.status).toBe('ok');
      expect(result.services.redis.status).toBe('ok');
      expect(result.services.database.latency).toBe(5);
      expect(result.services.redis.latency).toBe(2);
      expect(result.pool).toBeDefined();
      expect(result.pool?.totalCount).toBe(5);
      expect(result.version).toBeDefined();
    });

    it('should_return_degraded_status_when_redis_fails', async () => {
      // Arrange
      (databaseHealthCheck as jest.Mock).mockResolvedValue({
        status: 'ok',
        latency: 5,
      });
      (redisHealthCheck as jest.Mock).mockResolvedValue({
        status: 'error',
        error: 'Connection refused',
      });
      (getPoolStatus as jest.Mock).mockReturnValue({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });

      // Act
      const result = await controller.checkDetailed();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('ok');
      expect(result.services.redis.status).toBe('error');
    });

    it('should_return_error_status_when_database_fails', async () => {
      // Arrange
      (databaseHealthCheck as jest.Mock).mockResolvedValue({
        status: 'error',
        error: 'Connection timeout',
      });
      (redisHealthCheck as jest.Mock).mockResolvedValue({
        status: 'ok',
        latency: 2,
      });
      (getPoolStatus as jest.Mock).mockReturnValue({
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      });

      // Act
      const result = await controller.checkDetailed();

      // Assert
      expect(result.status).toBe('error');
      expect(result.services.database.status).toBe('error');
    });
  });

  describe('checkReady', () => {
    it('should_return_ready_true_when_database_is_healthy', async () => {
      // Arrange
      (databaseHealthCheck as jest.Mock).mockResolvedValue({
        status: 'ok',
        latency: 5,
      });

      // Act
      const result = await controller.checkReady();

      // Assert
      expect(result.ready).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should_return_ready_false_when_database_is_unhealthy', async () => {
      // Arrange
      (databaseHealthCheck as jest.Mock).mockResolvedValue({
        status: 'error',
        error: 'Connection failed',
      });

      // Act
      const result = await controller.checkReady();

      // Assert
      expect(result.ready).toBe(false);
      expect(result.reason).toBe('Connection failed');
    });
  });

  describe('checkLive', () => {
    it('should_return_alive_true', () => {
      // Act
      const result = controller.checkLive();

      // Assert
      expect(result.alive).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });
});
